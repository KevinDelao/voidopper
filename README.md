# Star Hopper - React Edition

A space-themed vertical climbing game built with React and HTML5 Canvas, inspired by Tiny Wings. Control a space bird climbing upward by bouncing between left and right terrain walls while avoiding asteroid enemies.

## Game Features

- **Space Bird Character**: Play as an adorable purple space bird with flapping wings
- **Vertical Climbing**: Climb upward instead of moving horizontally
- **Bouncing Mechanics**: Automatically bounce between left and right terrain walls
- **Left/Right Click Controls**: Click the side your bird is on to boost down the hills
- **Calming Music**: Space-themed ambient background music inspired by Tiny Wings
- **Immersive Sound Effects**: Boost, bounce, collision, and milestone sounds
- **Space Theme**: Beautiful space-themed graphics with stars, animated bird, and asteroids
- **Procedural Terrain**: Infinite randomly generated hill terrain
- **Enemy Obstacles**: Asteroids spawn as you climb - avoid them!
- **Score System**: Track your climbing distance in meters
- **Music Toggle**: Easy on/off button for background music
- **Responsive**: Works on desktop and mobile devices

## How to Play

1. **Click LEFT/RIGHT or press A/D keys** when your bird is on that side
2. **Time your inputs** when going down hills to accelerate and gain speed
3. The bird will automatically bounce from side to side
4. **Avoid asteroids** in the middle - hitting them ends the game
5. **Descend as far as possible** and beat your high score!

### Controls

**Mouse/Touch:**
- Click **LEFT** half of screen = Boost when bird is on left wall
- Click **RIGHT** half of screen = Boost when bird is on right wall

**Keyboard:**
- **A key** = Boost when bird is on left wall
- **D key** = Boost when bird is on right wall
- **M key** = Toggle music on/off
- **R key** or **Space** = Restart after game over

**Tips:**
- Match the side the bird is currently on
- Time your boosts when going DOWN hills for maximum acceleration

## Installation & Setup

### Prerequisites
- Node.js 14+ and npm

### Steps to Run

1. Navigate to the project directory:
   ```bash
   cd spaceGameReact
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000`

5. To build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
spaceGameReact/
├── public/
│   └── index.html              # HTML entry point
├── src/
│   ├── components/
│   │   └── Game.js             # Main game component with game loop
│   ├── Player.js               # Player class with physics
│   ├── Terrain.js              # Terrain generation and collision
│   ├── Enemy.js                # Enemy asteroid class
│   ├── App.js                  # Main React app component
│   ├── App.css                 # App styles
│   ├── index.js                # React entry point
│   └── index.css               # Global styles
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Game Architecture

### Components

**Game.js** - Main game component that:
- Manages the game loop using `requestAnimationFrame`
- Handles input (mouse/touch events)
- Updates game state
- Renders everything to canvas
- Manages UI and game over state

**Player.js** - Player class featuring:
- Physics simulation (velocity, forces, impulses)
- Collision handling with terrain
- Tap-to-accelerate boost mechanic
- Visual effects (trail, rotation, glow)

**Terrain.js** - Procedural terrain featuring:
- Sine wave-based hill generation
- Physics collision detection
- Space decorations (twinkling stars)
- Separate left and right walls

**Enemy.js** - Enemy asteroid featuring:
- Random procedural shapes
- Rotation animation
- Pulsing danger indicator
- Collision detection with player

### Game Mechanics

#### Physics
- **Gravity**: Constant downward pull (0.5 units/frame)
- **Bouncing**: When hitting terrain, player bounces to opposite side
- **Acceleration**: Holding click/tap on downslope applies boost force
- **Damping**: 1% velocity reduction per frame for realistic movement

#### Terrain Generation
- Uses sine waves with random amplitude (40-80 units)
- Segments generated every 80 pixels vertically
- New terrain chunks spawn as player climbs
- Decorated with twinkling stars

#### Collision Detection
- **Terrain**: Line segment vs circle collision
- **Enemies**: Circle vs circle distance check
- Collisions trigger appropriate responses (bounce or game over)

#### Scoring
- Distance = (Player Y position - 200) / 10
- Displayed in meters at top of screen
- High score tracked in component state

## Customization

You can adjust these values to modify gameplay:

### In `Game.js`:
```javascript
gravity: 0.5,              // Gravity strength
enemySpawnInterval: 300,   // Distance between enemies
```

### In `Player.js`:
```javascript
// Constructor
mass: 1.0,                 // Player mass
friction: 0.3,             // Surface friction
restitution: 0.6,          // Bounciness

// handleTerrainCollision()
horizontalForce: 400,      // Bounce force
upwardForce: 250,          // Upward boost

// applyHillBoost()
boostMagnitude: 600,       // Acceleration boost
```

### In `Terrain.js`:
```javascript
// generateTerrain()
segmentHeight: 80,         // Distance between points
amplitude: 40-80,          // Hill height variation
offset: 0-50,              // Random offset
```

## Controls

### Desktop
- **Click and Hold**: Accelerate on hills
- **Release**: Coast normally

### Mobile
- **Tap and Hold**: Accelerate on hills
- **Release**: Coast normally

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- ES6+ JavaScript
- React 18

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimization

The game uses several optimization techniques:
- RequestAnimationFrame for smooth 60fps rendering
- Delta time for frame-rate independent physics
- Off-screen entity cleanup
- Efficient collision detection (only nearby segments)

## Future Enhancements

Potential features to add:
- [ ] Power-ups (shields, speed boost, magnets)
- [ ] Multiple enemy types with different behaviors
- [ ] Parallax background layers
- [ ] Sound effects and background music
- [ ] LocalStorage for persistent high scores
- [ ] Social sharing of scores
- [ ] Different difficulty levels
- [ ] Player ship customization
- [ ] Combo system for successive boosts
- [ ] Particle effects for explosions

## Troubleshooting

**Game doesn't start:**
- Make sure all dependencies are installed (`npm install`)
- Check console for errors
- Ensure you're using Node 14+

**Performance issues:**
- Close other browser tabs
- Try a different browser
- Reduce browser zoom level
- Check if hardware acceleration is enabled

**Touch not working on mobile:**
- Make sure you're not scrolling the page
- The canvas should fill the viewport
- Check browser console for errors

## Credits

Created as a React web version of the iOS Star Hopper game, inspired by Tiny Wings' slope acceleration mechanics.

## License

MIT License - Feel free to use and modify for your own projects!
