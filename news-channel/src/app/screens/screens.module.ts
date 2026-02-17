import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScreensRoutingModule } from './screens-routing.module';
import { CategoriesComponent } from './categories/categories.component';
import { NewsArticleComponent } from './news-article/news-article.component';
import { GlobeComponent } from './globe/globe.component';
import { SettingsComponent } from './settings/settings.component';
import { NewsService } from '../services/news.service';

@NgModule({
  declarations: [
  ],
  imports: [
    CategoriesComponent,
    CommonModule,
    ScreensRoutingModule,
    NewsArticleComponent,
    GlobeComponent,
    SettingsComponent
  ],
  providers: [NewsService]
})
export class ScreensModule { }
