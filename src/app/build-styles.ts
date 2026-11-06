// Stylesheets for the build, composition, Team build and guide workspaces, in cascade order.
// Routes import this module rather than the sheets so every route that needs any of them loads
// all of them in the same order, whatever the player navigated from. They load after the
// root layout's global sheets; a rule here must never rely on losing to a later global rule.
import "./workspace-fidelity.css";
import "./loadout-cards.css";
import "./build-grind-workspace.css";
import "./grind-rebuild.css";
import "./build-archive-details.css";
import "./builds-discovery.css";
import "./library-tiles.css";
import "./builds-detail.css";
import "./builds-editor.css";
import "./teams-compositions.css";
import "./inventory-board.css";
import "./product-research.css";
import "./editor-workspaces.css";
