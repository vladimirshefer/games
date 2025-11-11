# Tower Defence Mini Game

## Game Design

- Single-player tower defence prototype with endless waves.
- Build towers on the map edges; towers auto-target the nearest creep in range.
- Creeps follow a fixed path toward the base; each leak costs 1 base HP.
- Survive as many waves as possible while managing coins earned from kills.

## Tech Notes

- Built with Phaser inside React (`index.tsx`).
- Core gameplay loop lives in `scene.ts`; tweak spawn timings, tower stats, or path points there.

› src/pages/games/TowerDefense/index.tsx need to reword the tower selection. now to select the tower type you have to press keyboard number 1-4 to select the tower type to build and you build with the simple click on the map.
i want to have a sidebar on the right, which will have all towers listed. the tower in the sidebar should have: the icon of the tower as it would be built, the cost to build this tower (use the dollat icon in sprite.ts) and the
information button (use arrowRightOutline sprite) which will pause the game and open the tower type details hud.
the tower type details hud should contain the sprite of the tower, the damage, the cooldown, the radius of the tower (where it can see the enemies and fire) in tiles (if the tower can shoot over 3 tiles, write 3), the text
description of the tower (how it works).
to set the tower player must drag the tower icon from the sidebar to the playing field. the tile where the tower will be build (under the players finger) should highlight with different color, so that player understands where the
tower will be build. during that drag until player releases the tower around the tower should be a cicle visually showing the shoot radius of the tower.
before you start the implementation repeat this prompt to me, fixing the wording and you can ask couple of questions if something is unclear

• I'm figuring out how to add a sidebar UI listing towers alongside the Phaser game canvas—whether to build it inside Phaser or as a React overlay on top. There’s complexity in syncing drag-and-drop tower selection from React UI into
   the Phaser scene for placement, so I’m considering bridging pointer events and exposing scene APIs to enable smooth interaction between UI and game logic. Lots to consider!

• I'm working out how to let the player drag tower icons from the sidebar onto the map, showing real-time highlights of buildable tiles and shooting radius as they drag. This means adding a method to convert world coordinates back
to grid tiles, managing pointer events in React for drag state, and syncing that with the Phaser scene to highlight and confirm placements smoothly. I'll need to blend DOM pointer handling for drag with Phaser's input for upgrades,
plus figure out how to reuse or add Graphics overlays for visual feedback during dragging. There's a lot to coordinate between React and Phaser input systems!


• I'm exploring how to bridge Phaser's game scene with React UI for tower defense controls, especially to compute tile-based ranges accurately. Since accessing tile size directly in React is tricky, I’m considering adding static
methods or event bridges in the Phaser scene to share that info. Also, I’m weighing whether to implement the tower selection sidebar and info HUD entirely within Phaser or as a React overlay. Implementing UI fully inside Phaser
might simplify drag-and-drop and pointer events, but React overlay fits better with existing page structure. I plan to reserve space on the right side for a sidebar, either by adjusting map rendering bounds or overlaying a semi-
transparent UI container. Drag-and-drop mechanics would involve Phaser input events, highlight overlays, and pausing the game during detailed HUD display using time scaling. It’s a balance between React-Phaser integration complexity
and clearer unified UI within Phaser. I’m sorting out architecture and API design for scene-UI communication and next will prototype the sidebar and info HUD inside the scene.

Outlining HUD and sidebar features

I’m planning the detailed implementation of the tower details HUD and the new sidebar UI within the Phaser scene. The HUD will pause gameplay via time scaling and input guards while letting the user interact with close controls.
The sidebar will display tower icons, costs with dollar signs, and info buttons that open the HUD. For drag-and-drop, I’ll manage pointer events manually to create a ghost tower sprite that follows the pointer without moving the
original icon. I’ll add highlight overlays for valid build spots and draw the tower’s shooting radius circle during dragging. The map rendering will adjust to reserve space for the sidebar by introducing viewport padding support in
MapRenderer. I’m considering how to organize containers and interactive elements, control event propagation, and update UI affordabilities based on coins. This comprehensive setup should provide a smooth user experience for tower
selection, drag placement, and viewing tower stats.

Planning drag, sidebar, and HUD updates

I'm laying out how to manage tower card affordability visuals, handle dragging with a ghost sprite and pointer events, and implement the tower details HUD as a modal that pauses gameplay. I'll tweak map rendering to reserve sidebar
space dynamically, update input handling to avoid conflicts during drag or HUD open states, and ensure UI elements reposition on window resize. The plan covers updating tower placement logic, showing cost with icons, highlighting
cards on drag, and keeping interactions smooth while paused or dragging. This sets the stage for a phased, clean implementation.

• Updated Plan
└ □ Add support for reserving UI padding in the map renderer so the playfield can shrink to leave room for the sidebar.
□ Implement the in-game sidebar with drag-and-drop placement, tile highlighting, and radius preview while updating placement logic to rely on dragging.
□ Add the tower details modal HUD that pauses/resumes gameplay and wire the info buttons and HUD text updates.

• I’m working through creating the sidebar UI with interactive tower cards, ensuring events propagate properly, and building drag-and-drop mechanics for towers with pointer event handling. I’m also integrating sidebar resizing, HUD
management, and pointer input configuration to coordinate tower placement and upgrades smoothly. It’s detailed but looks promising to provide a clean, responsive HUD experience!

Detailing tower HUD and input handler implementations

I'm mapping out how to build the tower details HUD with scrim and panel positioning that scales to viewport size, ensuring proper event blocking and pause control. I’m refining pointer event handling in configureInput, cleaning
unused shortcut code, and designing helper methods for tower drag-and-drop and build spots. There’s a lot to coordinate UI state, input events, and game pausing smoothly!
