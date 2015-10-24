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
	
	// Textures
	this.textures = [];
	
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

// This function handles the texture unit side of texture creation
// after execution, returns the created and bound texture
SlothGL.prototype.bufferTextureCreate = function(canvas){
	var length = this.textureBuffers.length;
	
	// Get the storage location of u_Sampler
	var u_Sampler = this.gl.getUniformLocation(this.gl.program, 'u_Sampler');
	if (!u_Sampler) {
		console.log('Failed to get the storage location of u_Sampler');
		return false;
	}
	
	// Lookup table for texture buffers
	var lookup = [
		this.gl.TEXTURE0,
		this.gl.TEXTURE1,
		this.gl.TEXTURE2,
		this.gl.TEXTURE3,
		this.gl.TEXTURE4,
		this.gl.TEXTURE5,
		this.gl.TEXTURE6,
		this.gl.TEXTURE7
	];
	
	// Case 1: no buffered texture units
	if(length === 0){
		// Create texture
		var texture = this.gl.createTexture();
		if (!texture) {
			console.log('Failed to create the texture object');
			return false;
		}
		
		// save canvas
		this.textureBuffers.push(texture);
		
		// bind to 0
		// Enable texture unit0
		this.gl.activeTexture(this.gl.TEXTURE0);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);

		// Set the texture unit 0 to the sampler
		this.gl.uniform1i(u_Sampler, 0);
		
		return texture;
	}
	
	// Case 2: less than 8 buffered texture units
	if(length < 8){
		// Create texture
		var texture = this.gl.createTexture();
		if (!texture) {
			console.log('Failed to create the texture object');
			return false;
		}
		
		// save canvas
		this.textureBuffers.push(texture);
		
		// bind to latest
		this.gl.activeTexture(lookup[length]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);

		// Set the texture unit 0 to the sampler
		this.gl.uniform1i(u_Sampler, length);
		
		return texture;
	}
	else{ // Case 3: 8 buffered texture units
	// Create texture
		var texture = this.gl.createTexture();
		if (!texture) {
			console.log('Failed to create the texture object');
			return false;
		}
		
		// overwrite canvas
		this.textureBuffers[0] = texture;
		
		// Enable texture unit0
		this.gl.activeTexture(this.gl.TEXTURE0);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);

		// Set the texture unit 0 to the sampler
		this.gl.uniform1i(u_Sampler, 0);
		
		return texture;
	}
};

// This function handles the texture unit side of texture rendering
// after execution, texture param is rendered
SlothGL.prototype.bufferTextureRender = function(texture){
	var length = this.textureBuffers.length;
	var found = -1; // index of found texture -1 if not found
	
	// Get the storage location of u_Sampler
	var u_Sampler = this.gl.getUniformLocation(this.gl.program, 'u_Sampler');
	if (!u_Sampler) {
		console.log('Failed to get the storage location of u_Sampler');
		return false;
	}
	
	// Lookup table for texture buffers
	var lookup = [
		this.gl.TEXTURE0,
		this.gl.TEXTURE1,
		this.gl.TEXTURE2,
		this.gl.TEXTURE3,
		this.gl.TEXTURE4,
		this.gl.TEXTURE5,
		this.gl.TEXTURE6,
		this.gl.TEXTURE7
	];
	
	// Case 1: empty texture buffer array
	if(length === 0){
		this.textureBuffers[0] = texture;
		// Enable correct texture unit
		this.gl.activeTexture(lookup[0]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.uniform1i(u_Sampler, 0);
		return;
	}
	
	// Search for texture
	for(var i=0; i<length; i++){
		if(this.textureBuffers[i] === texture){
			found = i;
			break;
		}
	}
	
	// Case 2: Found texture
	if(found !== -1){
		// Enable correct texture unit
		this.gl.activeTexture(lookup[found]);
		this.gl.uniform1i(u_Sampler, found);
		return;
	}
	
	// Case 3: Texture not found
	if(length < 8){ // Deletion not needed
		this.textureBuffers.push(texture);
		// Enable correct texture unit
		this.gl.activeTexture(lookup[length]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.uniform1i(u_Sampler, length);
		return;
	}
	else{ // Deletion needed
		this.textureBuffers[0] = texture; // overwrite
		// Enable correct texture unit
		this.gl.activeTexture(lookup[0]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.uniform1i(u_Sampler, 0);
		return;
	}
};

// This function updates a texture and puts in buffer
// after execution, requested texture is updated and in buffer
SlothGL.prototype.bufferTextureUpdate = function(textureObj){
	var texture = textureObj.texture;
	var canvas = textureObj.canvas;
	var length = this.textureBuffers.length;
	var found = -1; // index of found texture -1 if not found
	
	// Get the storage location of u_Sampler
	var u_Sampler = this.gl.getUniformLocation(this.gl.program, 'u_Sampler');
	if (!u_Sampler) {
		console.log('Failed to get the storage location of u_Sampler');
		return false;
	}
	
	// Lookup table for texture buffers
	var lookup = [
		this.gl.TEXTURE0,
		this.gl.TEXTURE1,
		this.gl.TEXTURE2,
		this.gl.TEXTURE3,
		this.gl.TEXTURE4,
		this.gl.TEXTURE5,
		this.gl.TEXTURE6,
		this.gl.TEXTURE7
	];
	
	// Case 1: empty texture buffer array
	if(length === 0){
		this.textureBuffers[0] = texture;
		
		// Flip y axis of indicated texture buffer
		//this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);
		// Enable correct texture unit
		this.gl.activeTexture(lookup[0]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.uniform1i(u_Sampler, 0);
		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);
		return;
	}
	
	// Search for texture
	for(var i=0; i<length; i++){
		if(this.textureBuffers[i] === texture){
			found = i;
			break;
		}
	}
	
	// Case 2: Found texture
	if(found !== -1){
		// Flip y axis of indicated texture buffer
		//this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);
		// Enable correct texture unit
		this.gl.activeTexture(lookup[found]);
		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);
		this.gl.uniform1i(u_Sampler, found);
		return;
	}
	
	// Case 3: Texture not found
	if(length < 8){ // Deletion not needed
		this.textureBuffers.push(texture);
		// Enable correct texture unit
		this.gl.activeTexture(lookup[length]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.uniform1i(u_Sampler, length);
		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);
		return;
	}
	else{ // Deletion needed
		this.textureBuffers[0] = texture;
		// Flip y axis of indicated texture buffer
		//this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, 0);
		// Enable correct texture unit
		this.gl.activeTexture(lookup[0]);
		// Bind the texture object to the target
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.uniform1i(u_Sampler, 0);
		// Set the texture parameters
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
		// Set the texture image
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, canvas);
		return;
	}
};

// Create entire canvas texture
SlothGL.prototype.drawCanvas = function(fromCanvas,x,y, length){
	// Create WebGL texture
	var texture = this.bufferTextureCreate(fromCanvas);
	
	// Create Texture object
	var myTex = new Texture(fromCanvas, x, y, 0, 0, fromCanvas.width, fromCanvas.height, texture);
	
	// Push Texture object into textures
	this.textures.push(myTex);
};

SlothGL.prototype.drawCanvasPart = function(fromCanvas, x, y, fromX, fromY, width, height){
	// Create WebGL texture
	var texture = this.bufferTextureCreate(fromCanvas);
	
	// Create Texture object
	var myTex = new Texture(fromCanvas, x, y, fromX, fromY, width, height, texture);
	
	// Push Texture object into textures
	this.textures.push(myTex);
};

SlothGL.prototype.updateAll = function(){
	for(var i=0; i<this.textures.length; i++){
		this.bufferTextureUpdate(this.textures[i]);
	}
}

SlothGL.prototype.render = function(){
	// Clear the screen
	this.clear();
	
	// Render all Textures
	for(var i=0; i<this.textures.length; i++){
		// Ready texture unit array for rendering
		this.bufferTextureRender(this.textures[i].texture);

		// draw the actual quadrilateral
		this.textures[i].render(this.gl);
	}
	//console.log(i);
};

// This object holds textures and additional data
Texture = function(canvas, x, y, fromX, fromY, width, height, texture){
	this.canvas = canvas;
	this.x = x; // x coord to be rendered to
	this.y = y; // y coord to be rendered to
	this.fromX = fromX; // x coor of texture 0,0
	this.fromY = fromY; // y coor of texture 0,0
 	this.width = width; // width of texture
	this.height = height; // height of texture
	this.texture = texture; // Created texture
};

Texture.prototype.canvasToST = function(x, y){
	var width = this.canvas.width;
	var height = this.canvas.height;
	var newX;
	var newY;

	// Convert from 2D canvas XY to ST texture coordinates
	newX = x/width;
	newY = y/height;
	return [newX,newY];
};

Texture.prototype.render = function(gl){
	this.gl = gl;
	
	var tex00 = this.canvasToST(this.fromX, this.fromY);
	var tex01 = this.canvasToST(this.fromX, this.fromY+this.height);
	var tex10 = this.canvasToST(this.fromX+this.width, this.fromY);
	var tex11 = this.canvasToST(this.fromX+this.width, this.fromY+this.height);
	
	var cor00 = [this.x,this.y];
	var cor01 = [this.x,this.y+this.height];
	var cor10 = [this.x+this.width,this.y];
	var cor11 = [this.x+this.width,this.y+this.height];
	
	var verticesTexCoords = new Float32Array([
	// Vertex coordinates, texture coordinate
		cor00[0],  cor00[1],   tex00[0], tex00[1],
		cor01[0],  cor01[1],   tex01[0], tex01[1],
		cor10[0],  cor10[1],   tex10[0], tex10[1],
		cor11[0],  cor11[1],   tex11[0], tex11[1]
	]);

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
	
	// Draw the rectangle with texture
	this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
};