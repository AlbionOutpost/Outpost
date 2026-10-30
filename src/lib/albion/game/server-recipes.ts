import "server-only";
import { setRecipeResolver, type Recipe } from "../recipes";
import { gameRecipe } from "./recipes";
export {
  gameRecipe,
  searchGameRecipes,
  gameRecipesForOutput,
  itemName,
  itemWeight,
  itemValue,
} from "./recipes";
// Server entry points that validate or re-run production import this module so saved
// scenarios can reference any recipe in the game data, not only the bundled defaults.
setRecipeResolver((id): Recipe | undefined => gameRecipe(id));
