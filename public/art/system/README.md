# Settings control skins

The reconstructed action/choice SVG surfaces now live in
`Wii.css/assets/interface/` and are consumed through shared Wii.css surface
variables. They are not duplicated here. These are reconstructed vector
surfaces, not extracted Nintendo textures.
They fit the outer white/cyan rim, curved highlight and lower gradient visible
in the source-linked Settings captures. The runtime owning tokens are in
`src/layout/system.js`; native bright-fill and cyan bounds remain independent
measurements in `docs/system-menu-refinement/`.
