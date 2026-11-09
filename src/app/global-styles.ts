// The stylesheets every page loads, in cascade order (DESIGN.md, Stylesheets). The root layout and
// global-error.tsx both import this one list: with webpack's CSS chunking off, a sheet imported by
// both but not the rest would be split into its own earlier file and lose to sheets it must beat.
import "./globals.css";
import "./workspace.css";
import "./player-workspaces.css";
import "./product-shell.css";
import "./brand-interactions.css";
import "./playful-ui.css";
import "./task-ui.css";
import "./reference-system.css";
import "./product-controls.css";
import "./workspace-depth.css";
import "./motion-system.css";
import "./premium-system.css";
import "./outpost-workspaces.css";
import "./site-refinement.css";
import "./product-system.css";
import "./product-support.css";
