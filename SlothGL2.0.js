SlothGL = function(){
	// Shaders
	this.vshader = 
		'attribute vec4 a_Position;\n' +
		'attribute vec2 a_TexCoord;\n' +
		'varying vec2 v_TexCoord;\n' +
		'uniform vec4 u_Translation;\n' +
		'uniform mat4 u_xformMatrix;\n' +
		'void main() {\n' +
		'  gl_Position = u_xformMatrix * a_Position;\n' +
		'  gl_Position +=u_Translation;\n' +
		'  v_TexCoord = a_TexCoord;\n' +
		'}\n';
		
	this.fshader = 
		'#ifdef GL_ES\n' +
		'precision mediump float;\n' +
		'#endif\n' +
		'uniform sampler2D u_Sampler;\n' +
		'varying vec2 v_TexCoord;\n' +
		'void main() {\n' +
		'  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
		'}\n';
	
	// WebGL program
	this.gl;
	
	// Texture buffers
	this.textureBuffers = [];
	
	// Projection matrix to give 2D-canvas-like coordinates
	// Default as identity matrix
	this.projectionMatrix = new Float32Array([
		1.0,  0.0, 0.0, 0.0,
		0.0,  1.0, 0.0, 0.0,
		0.0,  0.0, 1.0, 0.0,
		0.0,  0.0, 0.0, 1.0
	]);
};

// This function sets up the renderer
// canvas is an html5 canvas that the user wants to render to
// After the function is called, rendering with other webgl functions should work
SlothGL.prototype.setup = function(canvas){
	this.canvas = canvas;
	
	// Get a WebGL context inspired from example on MDN:
	// https://developer.mozilla.org/en-US/docs/Web/WebGL/Getting_started_with_WebGL
	this.gl = null;
	this.gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	// Make sure we got a context
	if (!this.gl) {
		alert("Failed to initialize WebGL. Please use a WebGL compatible browser.");
		this.gl = null;
		return;
	}

	// This code allows WebGL to blend alpha values
	// from: http://webglfundamentals.org/webgl/lessons/webgl-text-texture.html
	this.gl.enable(this.gl.BLEND);
	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

	// Initialize shaders
	// this.gl is now defined
	if (!this.initializeShaders(this.gl, this.vshader, this.fshader)) {
		console.log('Failed to intialize shaders.');
		return;
	}
	
		// Ready vertex buffer
		var vertexTexCoordBuffer = this.gl.createBuffer();
		if (!vertexTexCoordBuffer) {
			console.log('Failed to create the buffer object');
			return -1;
		}
		// Bind the buffer object to target
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexTexCoordBuffer);
		
		// Set up the projection matrix for 2D canvas-like coordinates
	this.reproject(canvas);
	// Pass the transformation matrix to the vertex shader via Uniform Variable
	var u_xformMatrix = this.gl.getUniformLocation(this.gl.program, 'u_xformMatrix');
	if (!u_xformMatrix) {
		console.log('Failed to get the storage location of u_xformMatrix');
		return;
	}
	this.gl.uniformMatrix4fv(u_xformMatrix, false, this.projectionMatrix);
}

// This function sets the projection matrix of the SlothGL object
// The projection matrix changes 2D canvas coordinates into webgl coordinates
// webglcanvas is the canvas to which the user wishes to render
SlothGL.prototype.reproject = function(webglcanvas){
	// Formula
	// newX = (x-width/2)/(width/2);
	// newY = ((height-y)-(height/2)) / (height/2)
	
	// For matrix use
	// newX = x/(width/2) - 1
	// newY =  - 1
	
	width = webglcanvas.width;
	height = webglcanvas.height;

	tempArray = [
		1/(width/2),  0.0, 0.0, 0.0, 
		0.0,  -2/height,  0.0, 0.0,
		0.0,  0.0, 1.0,  0.0,
		-1.0,  1.0, 0.0, 1.0
	];
	this.projectionMatrix = new Float32Array(tempArray);
}

// This function initializes the vertex and fragment shaders
// gl is the webgl program that is to be initialized
// vshader is a string containing the glsl code for the vertex shader
// fshader is a string containing the glsl code for the fragment shader
SlothGL.prototype.initializeShaders = function(gl, vshader, fshader){
	// make and verify vertex shader object
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	if(vertexShader == null){
		console.log("Unable to create vertex shader");
		return false;
	}
	
	// set vertex shader program source and compile
	gl.shaderSource(vertexShader, vshader);
	gl.compileShader(vertexShader);
	
	// Check result of vertexShader compilation
	if(!(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))){
		var errorMsg = gl.getShaderInfoLog(vertexShader);
		console.log('Failed to compile vertex shader: ' + errorMsg);
		gl.deleteShader(vertexShader);
		return false;
	}
	
	
	// make and verify fragment shader object
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	if(fragmentShader == null){
		console.log("Unable to create fragment shader");
		return false;
	}
	
	// set fragment shader program source and compile
	gl.shaderSource(fragmentShader, fshader);
	gl.compileShader(fragmentShader);
	
	// Check result of fragmentShader compilation
	if(!(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))){
		var errorMsg = gl.getShaderInfoLog(fragmentShader);
		console.log('Failed to compile fragment shader: ' + errorMsg);
		gl.deleteShader(fragmentShader);
		return false;
	}

	// Verify both shaders created
	if(!vertexShader || !fragmentShader){
		console.log("shaders no load");
		return false;
	}

	// make and verify program object
	var program = gl.createProgram();
	if(!program){
		console.log("program no create");
		return false;
	}

	// Attach vertex and fragment shader to program object
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	// Link program and verify linkng
	gl.linkProgram(program);
	if(!(gl.getProgramParameter(program, gl.LINK_STATUS))){
		var errorMsg = gl.getProgramInfoLog(program);
		console.log('Program filed to link: ' + errorMsg);
		gl.deleteProgram(program);
		gl.deleteShader(fragmentShader);
		gl.deleteShader(vertexShader);
		console.log("no program got");
		return false;
	}

	// Use and set the program
	gl.useProgram(program);
	gl.program = program;
	return true;
}

// This function clears the webgl canvas
// default black
// Takes optional rbga values
SlothGL.prototype.clear = function(r,b,g,a){
	// Default Black if nothing added
	if(r === undefined){
		this.gl.clearColor(0, 0, 0, 1);
	}
	else{ // otherwise use values given
		this.gl.clearColor(r, g, b, 1)
	}

	// Clear renderer
	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
}

SlothGL.prototype.test = function(fromCanvas,x,y, length){
  var verticesTexCoords = new Float32Array([
    // Vertex coordinates, texture coordinate
    x,  y+length,   0.0, 1.0,
    x, y,   0.0, 0.0,
     x+length,  y+length,   1.0, 1.0,
     x+length, y,   1.0, 0.0,
  ]);
  var n = 4; // The number of vertices

	// Buffer object already created and bound to
  // Write date into the buffer object
  this.gl.bufferData(this.gl.ARRAY_BUFFER, verticesTexCoords, this.gl.STATIC_DRAW);

  // Get a_Position location
  var FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_Position = this.gl.getAttribLocation(this.gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  this.gl.vertexAttribPointer(a_Position, 2, this.gl.FLOAT, false, FSIZE * 4, 0);
  this.gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_TexCoord
  var a_TexCoord = this.gl.getAttribLocation(this.gl.program, 'a_TexCoord');
  if (a_TexCoord < 0) {
    console.log('Failed to get the storage location of a_TexCoord');
    return -1;
  }
  // Assign the buffer object to a_TexCoord variable
  this.gl.vertexAttribPointer(a_TexCoord, 2, this.gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
  this.gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object
  
  var texture = this.gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  // Get the storage location of u_Sampler
  var u_Sampler = this.gl.getUniformLocation(this.gl.program, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }
  
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  this.gl.activeTexture(this.gl.TEXTURE0);
  // Bind the texture object to the target
  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

  // Set the texture parameters
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
  // Set the texture image
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, fromCanvas);
  
  // Set the texture unit 0 to the sampler
  this.gl.uniform1i(u_Sampler, 0);

  // Draw the rectangle
  this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, n);
};

SlothGL.prototype.checkTextureBuffer = function(canvas){
	// Case: empty array
	if(textureBuffers.length < 1){
		textureBuffers.push(canvas);
		return(this.gl.TEXTURE0);
	}
	else if(textureBuffers.length < 8){
		return(this.gl.TEXTURE1);
	}
}

TextureHolder = function(){
	
};
