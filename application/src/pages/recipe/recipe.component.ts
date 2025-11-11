import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';

@Component({
  selector: 'app-recipe-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe.component.html',
  styleUrls: ['./recipe.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeComponent {
  private recipeService = inject(RecipeService);
  recipe = this.recipeService.recipeContent;
}
