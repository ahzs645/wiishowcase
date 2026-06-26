#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import JSZip from "jszip";
import { processWAD } from "@firstform/wii-channel-renderer";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let crcTable = null;

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

function crc32(buffer) {
  if (!crcTable) crcTable = buildCrcTable();
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePngRgba(rgbaInput, width, height) {
  const rgba = Buffer.from(rgbaInput.buffer, rgbaInput.byteOffset, rgbaInput.byteLength);
  const expectedLength = width * height * 4;
  if (rgba.length !== expectedLength) {
    throw new Error(`RGBA data length mismatch: got ${rgba.length}, expected ${expectedLength}`);
  }

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * stride;
    const targetStart = y * (stride + 1);
    scanlines[targetStart] = 0; // PNG filter type 0: none.
    rgba.copy(scanlines, targetStart + 1, sourceStart, sourceStart + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(scanlines)),
    pngChunk("IEND"),
  ]);
}

function createWavBuffer(audio) {
  if (!audio?.pcm16?.length || !Number.isFinite(audio.sampleRate) || audio.sampleRate <= 0) {
    return null;
  }

  const channelCount = Math.max(1, audio.channelCount ?? audio.pcm16.length);
  const frameCount = Math.min(...audio.pcm16.map((channel) => channel.length));
  if (!Number.isFinite(frameCount) || frameCount <= 0) return null;

  const blockAlign = channelCount * 2;
  const byteRate = audio.sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(audio.sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const samples = audio.pcm16[channel] ?? audio.pcm16[audio.pcm16.length - 1];
      buffer.writeInt16LE(samples?.[frame] ?? 0, offset);
      offset += 2;
    }
  }

  return buffer;
}

function normalizeRenderState(value) {
  if (!value || value === "auto") return null;
  return String(value).trim().toUpperCase();
}

function compareRenderStates(left, right) {
  const leftMatch = String(left).match(/^RSO(\d+)$/i);
  const rightMatch = String(right).match(/^RSO(\d+)$/i);
  if (leftMatch && rightMatch) {
    return Number.parseInt(leftMatch[1], 10) - Number.parseInt(rightMatch[1], 10);
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true });
}

function collectRenderStateOptions(targetResult) {
  const states = new Set();
  for (const group of targetResult?.renderLayout?.groups ?? []) {
    const normalized = normalizeRenderState(group?.name);
    if (normalized && /^RSO\d+$/.test(normalized)) states.add(normalized);
  }
  for (const animEntry of targetResult?.animEntries ?? []) {
    const normalized = normalizeRenderState(animEntry?.state);
    if (normalized && /^RSO\d+$/.test(normalized)) states.add(normalized);
  }
  return [...states].sort(compareRenderStates);
}

function resolveAutoRenderState(targetResult) {
  const states = collectRenderStateOptions(targetResult);
  if (states.includes("RSO0")) return "RSO0";
  return states[0] ?? null;
}

function findStateAnimationEntry(targetResult, state) {
  const normalizedState = normalizeRenderState(state);
  if (!normalizedState) return null;
  return (targetResult?.animEntries ?? []).find((entry) => normalizeRenderState(entry?.state) === normalizedState) ?? null;
}

function shouldHoldStateAnimation(targetResult, stateAnim) {
  if (!stateAnim || targetResult?.animLoop) return false;
  const frameSize = Math.max(0, Math.floor(stateAnim.frameSize ?? 0));
  return frameSize > 0 && frameSize <= 180;
}

function inferPlaybackModeFromAnim(anim, fallback = "loop") {
  if (!anim) return fallback;
  return (anim.flags & 1) !== 0 ? "loop" : "once";
}

function resolveAnimationSelection(targetResult, selectedState = null, animOverrideId = null) {
  const explicitState = normalizeRenderState(selectedState);
  if (!targetResult) {
    return { anim: null, startAnim: null, loopAnim: null, renderState: explicitState, playbackMode: "loop" };
  }

  if (animOverrideId) {
    const entry = targetResult.animEntries?.find((candidate) => candidate.id === animOverrideId);
    if (entry?.anim) {
      return {
        anim: entry.anim,
        startAnim: null,
        loopAnim: entry.anim,
        renderState: null,
        playbackMode: inferPlaybackModeFromAnim(entry.anim),
        renderLayout: entry.renderLayout ?? null,
      };
    }
  }

  const autoState = resolveAutoRenderState(targetResult);
  const activeState = explicitState ?? autoState;
  const stateAnim = findStateAnimationEntry(targetResult, activeState)?.anim ?? null;

  if (stateAnim) {
    const startAnim = targetResult.animStart ?? null;
    if (startAnim) {
      return {
        anim: startAnim,
        startAnim,
        loopAnim: stateAnim,
        renderState: activeState ?? null,
        playbackMode: "loop",
      };
    }
    return {
      anim: stateAnim,
      startAnim: null,
      loopAnim: stateAnim,
      renderState: activeState ?? null,
      playbackMode: shouldHoldStateAnimation(targetResult, stateAnim) ? "hold" : "loop",
    };
  }

  if (!explicitState) {
    const defaultAnim = targetResult.anim ?? targetResult.animStart ?? targetResult.animLoop ?? null;
    const hasDistinctLoopAnim = Boolean(targetResult.animLoop && targetResult.animLoop !== targetResult.animStart);
    if (defaultAnim && !hasDistinctLoopAnim) {
      return {
        anim: defaultAnim,
        startAnim: null,
        loopAnim: defaultAnim,
        renderState: autoState ?? null,
        playbackMode: inferPlaybackModeFromAnim(defaultAnim),
      };
    }
    return {
      anim: targetResult.anim ?? null,
      startAnim: targetResult.animStart ?? null,
      loopAnim: targetResult.animLoop ?? targetResult.anim ?? null,
      renderState: autoState ?? null,
      playbackMode: "loop",
    };
  }

  const selectedAnim = targetResult.animLoop ?? targetResult.animStart ?? targetResult.anim ?? null;
  return {
    anim: selectedAnim,
    startAnim: null,
    loopAnim: selectedAnim,
    renderState: activeState,
    playbackMode: targetResult.animLoop || !selectedAnim ? "loop" : inferPlaybackModeFromAnim(selectedAnim),
  };
}

function shouldReplaceWithAuxiliary(paneEntry, frameSize) {
  if (!paneEntry?.tags || frameSize <= 0) return false;

  let hasKeyframes = false;
  for (const tag of paneEntry.tags) {
    for (const entry of tag.entries ?? []) {
      for (const keyframe of entry.keyframes ?? []) {
        hasKeyframes = true;
        if (keyframe.frame < frameSize) return false;
      }
    }
  }
  if (!hasKeyframes) return false;

  for (const tag of paneEntry.tags) {
    if (String(tag?.type ?? "") !== "RLVC") continue;
    for (const entry of tag.entries ?? []) {
      if (entry.type === 0x10 && entry.keyframes?.length > 0) {
        return (entry.keyframes[0].value ?? 0) <= 0;
      }
    }
  }

  return false;
}

function mergeRelatedRsoAnimations(primaryAnim, targetResult, activeState) {
  if (!primaryAnim || !targetResult || !activeState) return primaryAnim;
  const stateMatch = String(activeState).match(/^RSO(\d+)$/i);
  if (!stateMatch) return primaryAnim;

  const baseIndex = Number.parseInt(stateMatch[1], 10);
  const entries = targetResult.animEntries ?? [];
  if (entries.length <= 1) return primaryAnim;

  const primaryFrameSize = primaryAnim.frameSize ?? 0;
  const primaryPanesByName = new Map();
  for (const pane of primaryAnim.panes ?? []) {
    primaryPanesByName.set(pane.name, pane);
  }

  const replacedPaneNames = new Set();
  const additionalPanes = [];
  const additionalTimgs = [];

  for (let offset = 1; offset <= 3; offset += 1) {
    const targetState = `RSO${baseIndex + offset}`;
    const entry = entries.find((animEntry) => String(animEntry.state ?? "").toUpperCase() === targetState);
    if (!entry?.anim) continue;

    for (const pane of entry.anim.panes ?? []) {
      if (replacedPaneNames.has(pane.name)) continue;
      const existing = primaryPanesByName.get(pane.name);
      if (!existing) {
        additionalPanes.push(pane);
        primaryPanesByName.set(pane.name, pane);
      } else if (shouldReplaceWithAuxiliary(existing, primaryFrameSize)) {
        replacedPaneNames.add(pane.name);
        additionalPanes.push(pane);
      }
    }

    for (const timgName of entry.anim.timgNames ?? []) {
      if (timgName && !additionalTimgs.includes(timgName)) additionalTimgs.push(timgName);
    }
  }

  if (replacedPaneNames.size === 0 && additionalPanes.length === 0 && additionalTimgs.length === 0) {
    return primaryAnim;
  }

  return {
    ...primaryAnim,
    panes: [
      ...(primaryAnim.panes ?? []).filter((pane) => !replacedPaneNames.has(pane.name)),
      ...additionalPanes,
    ],
    timgNames: [
      ...(primaryAnim.timgNames ?? []),
      ...additionalTimgs.filter((name) => !(primaryAnim.timgNames ?? []).includes(name)),
    ],
  };
}

function resolveIconSelection(targetResult) {
  const selection = resolveAnimationSelection(targetResult);
  if (!selection.anim || !selection.renderState) return selection;

  let mergedAnim = mergeRelatedRsoAnimations(selection.anim, targetResult, selection.renderState);
  if (mergedAnim === selection.anim) return selection;

  const layoutPanes = targetResult?.renderLayout?.panes;
  if (layoutPanes) {
    const animatedNames = new Set(mergedAnim.panes.map((pane) => pane.name));
    const txtBgHideEntries = layoutPanes
      .filter((pane) => /^P_txtBg_\d+$/.test(pane.name) && !animatedNames.has(pane.name))
      .map((pane) => ({
        name: pane.name,
        tags: [{
          type: "RLVC",
          entries: [{
            targetGroup: 0,
            type: 0x10,
            dataType: 2,
            typeName: "RLVC",
            interpolation: "hermite",
            preExtrapolation: "clamp",
            postExtrapolation: "clamp",
            keyframes: [{ frame: 0, value: 0, blend: 0 }],
          }],
        }],
      }));
    if (txtBgHideEntries.length > 0) {
      mergedAnim = { ...mergedAnim, panes: [...mergedAnim.panes, ...txtBgHideEntries] };
    }
  }

  return {
    ...selection,
    anim: mergedAnim,
    loopAnim: selection.loopAnim === selection.anim ? mergedAnim : selection.loopAnim,
  };
}

function resolveIconViewport(layout) {
  if (!layout) return { width: 128, height: 96 };

  const picturePanes = (layout.panes ?? []).filter((pane) => pane.type === "pic1");
  const camelToSnake = (name) => String(name ?? "").replace(/([a-z])([A-Z])/g, "$1_$2");
  const explicitViewportPane =
    picturePanes.find((pane) => /^ch\d+$/i.test(pane.name)) ??
    picturePanes.find((pane) => /(?:^|_)(?:tv|icon|cork|frame|bg|back|base|board)(?:_|$)/i.test(camelToSnake(pane.name)));

  const fallbackViewportPane = picturePanes
    .filter((pane) => pane.visible !== false)
    .filter((pane) => (pane.alpha ?? 255) > 0)
    .filter((pane) => Math.abs(pane.size?.w ?? 0) >= 64 && Math.abs(pane.size?.h ?? 0) >= 32)
    .sort((left, right) => {
      const leftArea = Math.abs(left.size?.w ?? 0) * Math.abs(left.size?.h ?? 0);
      const rightArea = Math.abs(right.size?.w ?? 0) * Math.abs(right.size?.h ?? 0);
      return rightArea - leftArea;
    })[0];

  const iconPane = explicitViewportPane ?? fallbackViewportPane;
  if (!iconPane) return { width: 128, height: 96 };

  return {
    width: Math.max(1, Math.round(Math.abs(iconPane.size?.w ?? 128))),
    height: Math.max(1, Math.round(Math.abs(iconPane.size?.h ?? 96))),
  };
}

function collectPaneStateGroups(targetResult) {
  const groupsByKey = new Map();

  for (const pane of targetResult?.renderLayout?.panes ?? []) {
    if (pane?.type !== "pan1" && pane?.type !== "bnd1") continue;
    if (Number.isInteger(pane?.materialIndex) && pane.materialIndex >= 0) continue;

    const match = String(pane?.name ?? "").match(/^(.*?)(\d+)$/);
    if (!match) continue;

    const baseName = match[1];
    const index = Number.parseInt(match[2], 10);
    const key = `${pane.parent ?? "__root__"}|${baseName}`;

    let entry = groupsByKey.get(key);
    if (!entry) {
      entry = { parentName: pane.parent ?? null, baseName, options: new Map() };
      groupsByKey.set(key, entry);
    }
    if (!entry.options.has(index)) entry.options.set(index, pane.name);
  }

  const groups = [];
  for (const entry of groupsByKey.values()) {
    if (entry.options.size < 2) continue;
    const options = [...entry.options.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([index, paneName]) => ({ index, paneName }));
    const parentPart = entry.parentName ?? "__root__";
    const basePart = entry.baseName || "state";
    groups.push({
      id: `${parentPart}::${basePart}`,
      label: entry.parentName ? `${entry.parentName}/${basePart}` : basePart,
      options,
    });
  }

  return groups.sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));
}

function collectTitleLocales(targetResult) {
  const localeCodes = ["JP", "NE", "GE", "SP", "IT", "FR", "US", "KR", "CN"];
  const pattern = new RegExp(`(?:^|_)(${localeCodes.join("|")})(?:_|[0-9]|$)`);
  const locales = new Set();
  const tryExtract = (name) => {
    const match = String(name ?? "").match(pattern);
    if (match && localeCodes.includes(match[1])) locales.add(match[1]);
  };

  for (const group of targetResult?.renderLayout?.groups ?? []) tryExtract(group?.name);
  for (const pane of targetResult?.renderLayout?.panes ?? []) tryExtract(pane?.name);
  return [...locales].sort((left, right) => localeCodes.indexOf(left) - localeCodes.indexOf(right));
}

function detectFeatures(targetResult) {
  const features = {};
  const paneNames = new Set((targetResult?.renderLayout?.panes ?? []).map((pane) => pane.name));

  if (paneNames.has("WiiDisk") && paneNames.has("GCDisk") && paneNames.has("DVDDisk")) {
    features.hasDiscType = true;
    features.discTypes = ["auto", "all", "none", "wii", "gc", "dvd"];
  }
  if (paneNames.has("N_GCIcon") && paneNames.has("N_DiscUpdateIcon")) {
    features.hasIconScene = true;
    features.iconScenes = [
      { value: "auto", label: "Auto (GC Icon)" },
      { value: "gc", label: "GC Icon" },
      { value: "update", label: "Wii Console Update" },
    ];
  }

  return features;
}

function buildTargetOptions(targetResult) {
  if (!targetResult) return null;

  const options = {};
  const animEntries = targetResult.animEntries ?? [];
  if (animEntries.length > 0) {
    options.availableAnimations = animEntries.map((entry) => ({
      id: entry.id,
      path: entry.path,
      name: entry.path?.split("/").pop()?.replace(/\.[^.]+$/, "") ?? entry.id,
      frameSize: entry.frameSize ?? 0,
      loops: Boolean(entry.anim?.flags & 1),
      role: entry.role ?? null,
      state: entry.state ?? null,
    }));
  }

  const renderStates = collectRenderStateOptions(targetResult);
  if (renderStates.length > 0) options.availableRenderStates = renderStates;

  const paneStateGroups = collectPaneStateGroups(targetResult);
  if (paneStateGroups.length > 0) options.availablePaneStateGroups = paneStateGroups;

  const titleLocales = collectTitleLocales(targetResult);
  if (titleLocales.length > 0) options.availableTitleLocales = titleLocales;

  const features = detectFeatures(targetResult);
  if (Object.keys(features).length > 0) options.features = features;

  return Object.keys(options).length > 0 ? options : null;
}

async function serializeTextures(zip, prefix, tplImages) {
  const texturesManifest = {};
  const entries = Object.entries(tplImages ?? {});

  for (const [name, images] of entries) {
    texturesManifest[name] = [];
    for (let i = 0; i < images.length; i += 1) {
      const image = images[i];
      if (!image?.imageData) continue;
      const file = images.length > 1 ? `${name}_${i}.png` : `${name}.png`;
      zip.file(`${prefix}/textures/${file}`, encodePngRgba(image.imageData, image.width, image.height));
      texturesManifest[name].push({
        file,
        width: image.width,
        height: image.height,
        format: image.format,
      });
    }
  }

  zip.file(`${prefix}/textures.json`, JSON.stringify(texturesManifest, null, 2));
}

async function serializeFonts(zip, prefix, fonts) {
  for (const [fontName, fontData] of Object.entries(fonts ?? {})) {
    if (!fontData) continue;

    const meta = {
      fontInfo: fontData.fontInfo ?? null,
      glyphInfo: fontData.glyphInfo ?? null,
      charWidths: fontData.charWidths instanceof Map ? Array.from(fontData.charWidths.entries()) : [],
      charMap: fontData.charMap instanceof Map ? Array.from(fontData.charMap.entries()) : [],
      sheets: [],
    };

    const sheets = fontData.sheets ?? [];
    for (let i = 0; i < sheets.length; i += 1) {
      const sheet = sheets[i];
      if (!sheet?.imageData) continue;

      const file = `${fontName}_sheet_${i}.png`;
      zip.file(`${prefix}/fonts/${file}`, encodePngRgba(sheet.imageData, sheet.width, sheet.height));
      meta.sheets.push({
        file,
        width: sheet.width,
        height: sheet.height,
      });
    }

    zip.file(`${prefix}/fonts/${fontName}.json`, JSON.stringify(meta));
  }
}

async function serializeTarget(zip, prefix, result, animSelection, iconViewport, includeAllAnimations) {
  const layout = iconViewport
    ? { ...result.renderLayout, width: iconViewport.width, height: iconViewport.height }
    : result.renderLayout;

  zip.file(`${prefix}/layout.json`, JSON.stringify(layout, null, 2));

  const startAnim = animSelection.startAnim ?? null;
  const loopAnim = animSelection.loopAnim ?? animSelection.anim;
  if (startAnim) zip.file(`${prefix}/anim-start.json`, JSON.stringify(startAnim));
  if (loopAnim) zip.file(`${prefix}/anim-loop.json`, JSON.stringify(loopAnim));

  await serializeTextures(zip, prefix, result.tplImages);
  await serializeFonts(zip, prefix, result.fonts);

  if (includeAllAnimations && result.animEntries?.length > 0) {
    const entriesMeta = result.animEntries.map((entry) => ({
      id: entry.id,
      path: entry.path,
      role: entry.role ?? null,
      state: entry.state ?? null,
      frameSize: entry.frameSize ?? 0,
      paneCount: entry.paneCount ?? 0,
      flags: entry.anim?.flags ?? 0,
      hasLayout: Boolean(entry.renderLayout || entry.layout),
    }));
    zip.file(`${prefix}/anim-entries.json`, JSON.stringify(entriesMeta));

    for (let i = 0; i < result.animEntries.length; i += 1) {
      const entry = result.animEntries[i];
      if (entry.anim) zip.file(`${prefix}/anims/${i}.json`, JSON.stringify(entry.anim));
      const entryLayout = entry.renderLayout || entry.layout;
      if (entryLayout) zip.file(`${prefix}/anims/${i}-layout.json`, JSON.stringify(entryLayout));
    }
  }
}

function generateReadme(manifest) {
  return `# Wii Channel Renderer Bundle

Source: ${manifest.sourceFile ?? "unknown"}
Title ID: ${manifest.titleId ?? "unknown"}

This bundle contains parsed renderer assets for wiishowcase. It is not a pre-rendered
video or frame sequence; the runtime uploads textures and renders the layout live.
`;
}

async function exportRendererBundle({
  parsed,
  sourceFileName,
  rendererOptions,
  exportAspect,
  includeAllAnimations,
}) {
  const zip = new JSZip();
  const manifest = {
    version: "1.0",
    sourceFile: sourceFileName ?? null,
    titleId: parsed.wad?.titleId ?? null,
    hasAudio: false,
    exportAspect,
    rendererOptions: {
      tevQuality: rendererOptions.tevQuality ?? "fast",
      titleLocale: rendererOptions.titleLocale ?? null,
      paneStateSelections: rendererOptions.paneStateSelections ?? {},
    },
  };

  const audioData = parsed.results?.audio;
  const wavBuffer = createWavBuffer(audioData);
  if (wavBuffer) {
    zip.file("audio.wav", wavBuffer);
    manifest.hasAudio = true;
    manifest.audio = {
      sampleRate: audioData.sampleRate,
      channelCount: audioData.channelCount ?? audioData.pcm16?.length ?? 1,
      sampleCount: audioData.sampleCount ?? 0,
      loopFlag: Boolean(audioData.loopFlag),
      loopStart: audioData.loopStart ?? 0,
      durationSeconds: audioData.durationSeconds ?? 0,
    };
  }

  const bannerResult = parsed.results?.banner;
  const bannerSelection = resolveAnimationSelection(bannerResult);
  if (bannerResult && bannerSelection?.anim) {
    await serializeTarget(zip, "banner", bannerResult, bannerSelection, null, includeAllAnimations);
    const startAnim = bannerSelection.startAnim ?? null;
    const loopAnim = bannerSelection.loopAnim ?? bannerSelection.anim;
    manifest.banner = {
      width: bannerResult.renderLayout?.width ?? 608,
      height: bannerResult.renderLayout?.height ?? 456,
      fps: 60,
      startFrames: startAnim?.frameSize ?? 0,
      loopFrames: loopAnim?.frameSize ?? 120,
      animSelection: {
        renderState: bannerSelection.renderState ?? null,
        playbackMode: bannerSelection.playbackMode ?? "loop",
      },
    };
    const bannerOptions = buildTargetOptions(bannerResult);
    if (bannerOptions) manifest.banner.options = bannerOptions;
  }

  const iconResult = parsed.results?.icon;
  const iconSelection = resolveIconSelection(iconResult);
  if (iconResult && iconSelection?.anim) {
    const iconViewport = resolveIconViewport(iconSelection.renderLayout ?? iconResult.renderLayout);
    await serializeTarget(zip, "icon", iconResult, iconSelection, iconViewport, includeAllAnimations);
    const startAnim = iconSelection.startAnim ?? null;
    const loopAnim = iconSelection.loopAnim ?? iconSelection.anim;
    manifest.icon = {
      width: iconViewport?.width ?? iconResult.renderLayout?.width ?? 128,
      height: iconViewport?.height ?? iconResult.renderLayout?.height ?? 128,
      fps: 60,
      startFrames: startAnim?.frameSize ?? 0,
      loopFrames: loopAnim?.frameSize ?? 120,
      animSelection: {
        renderState: iconSelection.renderState ?? null,
        playbackMode: iconSelection.playbackMode ?? "loop",
      },
    };
    const iconOptions = buildTargetOptions(iconResult);
    if (iconOptions) manifest.icon.options = iconOptions;
  }

  if (!manifest.banner && !manifest.icon) {
    throw new Error("Parsed WAD did not contain a renderable banner or icon");
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("README.md", generateReadme(manifest));

  return {
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
    manifest,
  };
}

function parseArgs(argv) {
  const positional = [];
  const options = {
    exportAspect: "4:3",
    includeAllAnimations: true,
    rendererOptions: {
      tevQuality: "fast",
      titleLocale: null,
      paneStateSelections: {},
    },
  };

  for (const arg of argv) {
    if (arg === "--no-all-animations") {
      options.includeAllAnimations = false;
    } else if (arg.startsWith("--aspect=")) {
      options.exportAspect = arg.slice("--aspect=".length);
    } else if (arg.startsWith("--tev-quality=")) {
      options.rendererOptions.tevQuality = arg.slice("--tev-quality=".length);
    } else if (arg.startsWith("--title-locale=")) {
      options.rendererOptions.titleLocale = arg.slice("--title-locale=".length) || null;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    throw new Error("Usage: node scripts/export-channel-bundle.mjs <input.wad> <output.zip> [--aspect=4:3] [--tev-quality=fast|accurate] [--no-all-animations]");
  }

  return {
    inputPath: resolve(positional[0]),
    outputPath: resolve(positional[1]),
    ...options,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const buffer = await readFile(args.inputPath);
  const logger = {
    info() {},
    success() {},
    warn(message) {
      console.warn(`[export-channel-bundle] ${message}`);
    },
    error(message) {
      console.error(`[export-channel-bundle] ${message}`);
    },
  };

  const parsed = await processWAD(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), logger);
  const { buffer: zipBuffer, manifest } = await exportRendererBundle({
    parsed,
    sourceFileName: basename(args.inputPath),
    rendererOptions: args.rendererOptions,
    exportAspect: args.exportAspect,
    includeAllAnimations: args.includeAllAnimations,
  });

  await mkdir(dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, zipBuffer);

  const summary = {
    output: args.outputPath,
    titleId: manifest.titleId,
    hasAudio: manifest.hasAudio,
    banner: manifest.banner
      ? {
          startFrames: manifest.banner.startFrames,
          loopFrames: manifest.banner.loopFrames,
          animationEntries: manifest.banner.options?.availableAnimations?.length ?? 0,
        }
      : null,
    icon: manifest.icon
      ? {
          startFrames: manifest.icon.startFrames,
          loopFrames: manifest.icon.loopFrames,
          renderState: manifest.icon.animSelection.renderState,
          animationEntries: manifest.icon.options?.availableAnimations?.length ?? 0,
        }
      : null,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
