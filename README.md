# SlothGL
WebGL for the Lazy

## Currently supporting:
text rendering
2D image rendering
path drawing

## To use
Import SlothGL2.0.js
```
<script src="SlothGL2.0.js"></script>
```

make a renderer and feed it a canvas
```
var canvas = document.getElementById("canvas1");
renderer = new SlothGL();
renderer.setup(canvas);
```

draw something
```
renderer.changeFont("50px Arial");
renderer.changeColor("white");
renderer.fillText("Hello, World", 0, 0);
```

render!
```
renderer.render();
```

Currently supported functions
```
// Write text
renderer.fillText(text, x, y);

// Draw an image
renderer.drawImage(image, x, y, [width], [height]);

// Draw a rectangle
renderer.fillRect(x, y, width, height);

// Make path similar to 2d canvas
renderer.beginPath();
renderer.mouseTo(x, y);
renderer.lineTo(x, y);
renderer.stroke();
renderer.fill();
```