// This Class contains the SlothGL renderer.
// A SlothGL object must be created before using the features.
// A SlothGL object contains:
// vshader: a string containing vertex shader code
// fshader: a string containing fragment shader code
// gl: the WebGL program
// textures: a texture holder object of class TextureHolder
// projectionMatrix: a float32 array that translates canvas coordinates to WebGL coordinates
// color: font color
// font: canvas font
// canvas: the 3D WebGL canvas
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
	
	// Text and Images stored here
	this.textures = new TextureHolder();
	
	// Projection matrix to give 2D-canvas-like coordinates
	// Default as identity matrix
	this.projectionMatrix = new Float32Array([
		1.0,  0.0, 0.0, 0.0,
		0.0,  1.0, 0.0, 0.0,
		0.0,  0.0, 1.0, 0.0,
		0.0,  0.0, 0.0, 1.0
	]);
	
	// Color, font
	this.color = "red";
	this.font = "20px Times New Roman";
	
	// Canvas
	this.canvas;
}

// This function just says hello
// Maybe can help user know that SlothGL was correctly added
SlothGL.prototype.hello = function(){
	console.log("SlothGL: WebGL for the lazy");
}

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

// This function renders whatever images have been set
SlothGL.prototype.render = function(){
	this.textures.render(this.canvas, this.gl);
}

// This function sets the text color
// color is the color you want to use eg. "red" "#ff0000"
SlothGL.prototype.setColor = function(color){
	this.color = color;
	this.textures.setColor(color);
}

// This function returns the color for rendering text
SlothGL.prototype.getColor = function(){
	return(this.textures.getColor());
}

// This function sets the font for rendering text
// font is the font the user wishes to add
SlothGL.prototype.setFont = function(font){
	this.font = font;
	this.textures.setFont(font);
}

// This function adds some text to the webgl program
// text is the text you wish to render
// x is the x coordinate of the text in 2D canvas coordinates
// y is the y coordinate of the text in 2D canvas coordinates
SlothGL.prototype.fillText = function(text, x, y){
	this.textures.addWord(text, x, y, this.gl);
}

// This function draws an image
// The user first needs an image in an image tag
// img is the image
// x is the x coordinate in 2D canvas coordinates
// y is the y coordinate in 2D canvas coordinates
// width is the width of the image
// height is the height of the image
// gl is the webgl program 
SlothGL.prototype.drawImage = function(img, x, y, width, height, gl){
	this.textures.addImage(img, x, y, width, height, gl);
	console.log("drawImage slothgl");
}

// TextureHolder is an object that holds textures
// the SlothGL object contains a TextureHolder
// defaultSize is the size of one texture defaults to 1024
// wordArray is an array of words
// canvasArray is an array of smart canvases for storing textures
// textrureArray is a SmartTexture object
function TextureHolder(){
	// Default size of canvas
	this.defaultSize = 1024; // here for easy access

	// 1D array [word, word, word, ...]
	this.wordArray = [];

	// array [canvas, canvas, canvas, ...]
	this.canvasArray = [];
	
	// for multiple texture registers
	this.textureArray = new SmartTexture();
	
	// Start with 1 empty smartcanvas
	var tempCanvas = new SmartCanvas('24px "Times New Roman"',this.defaultSize);
	//this.canvasArray.push(new SmartCanvas('24px "Times New Roman"',this.defaultSize));	
	this.canvasArray.push(tempCanvas);	
}

// This function adds an image to the TextureHolder
// most likely called from adding an image in SlothGL
// img is the image
// x is the x coordinate in 2D canvas coordinates
// y is the y coordinate in 2D canvas coordinates
// width is the width of an image
// height is the height of an image
// gl is the webgl program
TextureHolder.prototype.addImage = function(img, x, y, width, height, gl){
	var latest = this.canvasArray[this.canvasArray.length-1];
	//this.canvasArray[this.canvasArray.length-1].drawImage(img, x, y, width, height);
	
	var latest = this.canvasArray[this.canvasArray.length-1];
	var testval = latest.testImage(width,height);
	var widthHeight;
	
	// Add to canvas according to testval
	if(testval !== -1){ // no need for new canvas
		widthHeight = latest.drawImage(img, x, y, width, height, testval);
	}
	else{ // need new canvas
		this.addCanvas(gl);
		latest = this.canvasArray[this.canvasArray.length-1];
		widthHeight = latest.drawImage(img, x, y, width, height, testval);
	}
	
	// Add word to wordArray
	//this.wordArray.push(new Word("", latest, x, y, x, y, width, height));
	this.wordArray.push(new Word("", latest, x, y, widthHeight[0], widthHeight[1], latest.lastX-widthHeight[0], height));
}

// This function adds a word to the TextureHolder object
// most likely called from SlothGL call
// text is the text to be rendereed
// x is the x coordinate of the text in 2D canvas coordinates
// y is the y coordinate of the text in 2D canvas coordinates
TextureHolder.prototype.addWord = function(text, x, y, gl){
	var testval = this.tryAdd(text);
	var latest = this.canvasArray[this.canvasArray.length-1];
	var widthHeight;
	
	// Add to canvas according to testval
	if(testval !== -1){ // no need for new canvas
		widthHeight = latest.writeWord(text, testval);
	}
	else{ // need new canvas
		this.addCanvas(gl);
		latest = this.canvasArray[this.canvasArray.length-1];
		widthHeight = latest.writeWord(text, 0);
	}
	
	// Add word to wordArray
	this.wordArray.push(new Word(text, latest, x, y, widthHeight[0], widthHeight[1], latest.lastX-widthHeight[0], latest.lineHeight, gl));
}

// This function tries to add a text to a texture holder
// text is the text that the function tries to fit on the screen
// The function tries to fit text to the latest canvas in use
// returns: 
//	0 if word fits
//  1 if new line needed
// -1 if a new canvas needs to be created
TextureHolder.prototype.tryAdd = function(text){
	return(this.canvasArray[this.canvasArray.length-1].testWord(text));
}

// This function adds a new canvas to the texture holder
// gl is the webgl program in use
TextureHolder.prototype.addCanvas = function(gl){
	// Add a canvas
	// we should already know this.nextY so passing it saves us a calculation
	if(this.canvasArray[this.canvasArray.length-1].texUpdate === true){
		this.canvasArray[this.canvasArray.length-1].saveTexture(gl);
	}
	
	// Pre-ready Canvas in texture registers until full
	if(this.textureArray.array.length < this.textureArray.numTextureRegs){
		this.textureArray.add(this.canvasArray[this.canvasArray.length-1]);
	}
	
	var tempCanvas = new SmartCanvas(this.getFont(),this.defaultSize,this.nextY)
	//this.canvasArray.push(new SmartCanvas(this.getFont(),this.defaultSize,this.nextY));
	this.canvasArray.push(tempCanvas);
}

// This function sets the font of the TextureHolder
// most likely called from a SlothGL function
// font is the font to be set
TextureHolder.prototype.setFont = function(font){
	this.canvasArray[this.canvasArray.length-1].changeFont(font);
}

// This function gets the font of the TextureHolder
// most likely called from a SlothGL function
TextureHolder.prototype.getFont = function(){
	return(this.canvasArray[this.canvasArray.length-1].returnFont());
}

// This function gets the color of the TextureHolder
// most likely called from a SlothGL function
TextureHolder.prototype.getColor = function(){
	return(this.canvasArray[this.canvasArray.length-1].returnColor());
}

// This function sets the color of the TextureHolder
// most likely called from a SlothGL function
// color is the color to be set
TextureHolder.prototype.setColor = function(color){
	this.canvasArray[this.canvasArray.length-1].changeColor(color);
}

// This function renders the contents of the TextureHolder
// webglcanvas is the canvas where the contents will be rendered
// gl is the webgl program that will be used
TextureHolder.prototype.render = function(webglcanvas, gl){
	var lastCanvas = undefined;
	var needUpdate;
	var tempCanvas;
	
	tempCanvas = this.textureArray.search(this.canvasArray[this.canvasArray.length-1], gl);
	//console.log(tempCanvas);
	if(tempCanvas === 0){
		console.log("cat");
		this.textureArray.add(this.canvasArray[this.canvasArray.length-1], gl);
	}
	
	for(i=0; i< this.canvasArray.length; i++){
		tempCanvas = this.textureArray.search(this.canvasArray[i].canvas, gl);
		if(tempCanvas === 0){
			this.textureArray.add(this.canvasArray[i].canvas, gl);
		}
		tempCanvas = this.textureArray.search(this.canvasArray[i].canvas, gl);
		if(tempCanvas === 0){
			console.log(i);
		}
		gl.activeTexture(tempCanvas);
		gl.bindTexture(gl.TEXTURE_2D, this.canvasArray[i].texture);
		//console.log(tempCanvas);
	}
	//console.log(this.textureArray);
	
	for(var i=0; i<this.wordArray.length; i++){
		tempCanvas = this.textureArray.search(this.wordArray[i].canvas.canvas, gl);
		if(tempCanvas === 0){
			this.textureArray.add(this.wordArray[i].canvas.canvas, gl);
			tempCanvas = this.textureArray.search(this.wordArray[i].canvas.canvas, gl);
			gl.activeTexture(tempCanvas);
			gl.bindTexture(gl.TEXTURE_2D, this.wordArray[i].canvas.texture);
		}
		else{
			gl.activeTexture(tempCanvas);
		}
		this.wordArray[i].render2(webglcanvas, gl);
	}
	
	/*
	for(var i=0; i<this.wordArray.length; i++){
		if(i==0){
			gl.bindTexture(gl.TEXTURE_2D, this.wordArray[i].canvas.texture);
		}
		
		// Actually write word. Other code for coordination
		this.wordArray[i].render(webglcanvas, needUpdate, gl);
		
		if(i !== 0 && i != this.wordArray.length-1){
			lastCanvas = this.wordArray[i+1].canvas.canvas;
		}
		else{
			lastCanvas = undefined;
		}
		if(lastCanvas !== this.wordArray[i].canvas.canvas){
			if(i+1 != this.wordArray.length){
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.wordArray[i+1].canvas.texture);
			//numTexBind++;
			}
		}
		
	}
	*/
}

// This object stores Canvases
function SmartTexture(){
	this.numTextureRegs = 8;
	this.array = [];
}

// This method adds canvases
SmartTexture.prototype.add = function(canvas){
	// free registers
	if(this.array.length < this.numTextureRegs){
		this.array.push(canvas);
	}
	else{ // no free registers
		// pop front
		this.array.shift();
		// now add new canvas
		this.array.push(canvas);
	}
}

// This method searches the smart Texture for a canvas
// Returns register name if found
// Retunrs 0 if not found
SmartTexture.prototype.search = function(canvas, gl){
	for(i=0; i<this.array.length; i++){
		if(canvas === this.array[i]){
			switch(i){
				case 0:
					return gl.TEXTURE0;
					break;
				case 1:
					return gl.TEXTURE1;
					break;
				case 2:
					return gl.TEXTURE2;
					break;
				case 3:
					return gl.TEXTURE3;
					break;
				case 4:
					return gl.TEXTURE4;
					break;
				case 5:
					return gl.TEXTURE5;
					break;
				case 6:
					return gl.TEXTURE6;
					break;
				case 7:
					return gl.TEXTURE7;
					break;
			}
		}
	}
	return 0;
}

// Word is an object that stores text
// text, coordinates, and its location on a canvas are stored
function Word(text, canvas, x, y, xc, yc, widthc, heightc){
	this.text = text; // text of the word
	this.canvas = canvas; // which SmartCanvas the word is in
	this.x = x; // x coordinate in webgl
	this.y = y; // y coordinate in webgl
	this.xc = xc; // x coordinate on the canvas
	this.yc = yc; // y coordinate on the canvas
	this.widthc = widthc; // width of text on canvas
	this.heightc = heightc; // height of text on canvas
	this.verticies; // a float32 array of verticies
	this.Tx = 0.0; // translation in x coordinate
	this.Ty = 0.0; // translation in y coordinate
}

// NOT USED
// This function renders the word itself
// most likely called from TextureHolder
// glcanvas is the canvas to which the user wants to render
// needUpdate indicates if the texture needs an update
// gl is the webgl program
Word.prototype.render = function (glcanvas, needUpdate, gl){
	// Make sure the texture is ready before any rendering
	this.canvas.saveTexture(gl);

	// Calculate WebGL verticies
	var tex00 = this.canvasToST(this.xc, this.yc);
	var tex01 = this.canvasToST(this.xc, this.yc+this.heightc);
	var tex10 = this.canvasToST(this.xc+this.widthc, this.yc);
	var tex11 = this.canvasToST(this.xc+this.widthc, this.yc+this.heightc);
	
	var cor00 = [this.x,this.y];
	var cor01 = [this.x,this.y+this.heightc];
	var cor10 = [this.x+this.widthc,this.y];
	var cor11 = [this.x+this.widthc,this.y+this.heightc];
	
	this.vertices = new Float32Array([
	// Vertex coordinates, texture coordinate
		cor00[0],  cor00[1],   tex00[0], tex00[1],
		cor01[0],  cor01[1],   tex01[0], tex01[1],
		cor10[0],  cor10[1],   tex10[0], tex10[1],
		cor11[0],  cor11[1],   tex11[0], tex11[1]
	]);
	
	// Pass the translation distance to the vertex shader
	 var u_Translation = gl.getUniformLocation(gl.program, 'u_Translation');
	 if (!u_Translation) {
		console.log('Failed to get the storage location of u_Translation');
		return;
	 }
	 gl.uniform4f(u_Translation, this.Tx, this.Ty, 0.0, 0.0);
	
	// Render the array with vertices
	// This needs to be called each time
	gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

	var FSIZE = this.vertices.BYTES_PER_ELEMENT;
	//Get the storage location of a_Position, assign and enable buffer
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
	gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

	// Get the storage location of a_TexCoord
	var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
	if (a_TexCoord < 0) {
		console.log('Failed to get the storage location of a_TexCoord');
		return -1;
	}
	// Assign the buffer object to a_TexCoord variable
	gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
	gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

	// Init Texture
	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
	// Enable texture unit0
	//gl.activeTexture(gl.TEXTURE0);
	// Bind the texture object to the target
	//if(needUpdate === true){
	//	gl.bindTexture(gl.TEXTURE_2D, this.canvas.texture);
	//	numTexBind++;
	//}

	// Set the texture parameters
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
		if (!u_Sampler) {
		console.log('Failed to get the storage location of u_Sampler');
		return false;
	}

	// Set the texture unit 0 to the sampler
	gl.uniform1i(u_Sampler, 0);
	
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // Draw the rectangle
}

// This function renders the word itself
// most likely called from TextureHolder
// glcanvas is the canvas to which the user wants to render
// gl is the webgl program
Word.prototype.render2 = function (glcanvas, gl){
	// Make sure the texture is ready before any rendering
	this.canvas.saveTexture(gl);

	// Calculate WebGL verticies
	var tex00 = this.canvasToST(this.xc, this.yc);
	var tex01 = this.canvasToST(this.xc, this.yc+this.heightc);
	var tex10 = this.canvasToST(this.xc+this.widthc, this.yc);
	var tex11 = this.canvasToST(this.xc+this.widthc, this.yc+this.heightc);
	
	var cor00 = [this.x,this.y];
	var cor01 = [this.x,this.y+this.heightc];
	var cor10 = [this.x+this.widthc,this.y];
	var cor11 = [this.x+this.widthc,this.y+this.heightc];
	
	this.vertices = new Float32Array([
	// Vertex coordinates, texture coordinate
		cor00[0],  cor00[1],   tex00[0], tex00[1],
		cor01[0],  cor01[1],   tex01[0], tex01[1],
		cor10[0],  cor10[1],   tex10[0], tex10[1],
		cor11[0],  cor11[1],   tex11[0], tex11[1]
	]);
	
	// Pass the translation distance to the vertex shader
	 var u_Translation = gl.getUniformLocation(gl.program, 'u_Translation');
	 if (!u_Translation) {
		console.log('Failed to get the storage location of u_Translation');
		return;
	 }
	 gl.uniform4f(u_Translation, this.Tx, this.Ty, 0.0, 0.0);
	
	// Render the array with vertices
	// This needs to be called each time
	gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

	var FSIZE = this.vertices.BYTES_PER_ELEMENT;
	//Get the storage location of a_Position, assign and enable buffer
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
	gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

	// Get the storage location of a_TexCoord
	var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
	if (a_TexCoord < 0) {
		console.log('Failed to get the storage location of a_TexCoord');
		return -1;
	}
	// Assign the buffer object to a_TexCoord variable
	gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
	gl.enableVertexAttribArray(a_TexCoord);  // Enable the assignment of the buffer object

	// Set the texture parameters
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
		if (!u_Sampler) {
		console.log('Failed to get the storage location of u_Sampler');
		return false;
	}

	// Set the texture unit 0 to the sampler
	gl.uniform1i(u_Sampler, 0);
	
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); // Draw the rectangle
}

// This function converts 2D canvas coordinates to ST coordinates
// x is the 2D canvas x coordinate
// y is the 2D canvas y coordinate
Word.prototype.canvasToST = function(x, y){
	var width = this.canvas.canvas.width;
	var height = this.canvas.canvas.height;
	var newX;
	var newY;

	// Convert from canvas to ST texture coordinates
	newX = x/width;
	newY = (height-y)/height; // broken
	//console.log(newX+" "+newY);
	return [newX,newY];
}

// This object is a canvas with additional data for stacking textures
// font is the default font for text rendering
// size is the size of the square canvas
// height is the default line height
function SmartCanvas(font, size, height){
	// Add new hidden canvas element
	this.canvas = document.createElement("canvas");
	document.body.appendChild(this.canvas);
	this.canvas.height = size; // make sure size works for webgl texture
	this.canvas.width = size;  // ie a square of power of 2
	//this.canvas.setAttribute("style", "visibility:hidden;"); // hide the canvas
	//if(DEBUG){
	//	this.canvas.setAttribute("style", "visibility:visible;"); // unhide the canvas
	//}
	// Font and alignment
	this.font = font;
	var ctx = this.canvas.getContext("2d");
	ctx.textBaseline="top"; //*** CRUCIAL CODE *** makes alignment standard
	ctx.font = font; // set canvas to start with this font
	this.color = "red";
	ctx.fillStyle = this.color;

	// Keep track of text locations
	// Start at top left corner and work our way down
	this.lastX = 0;
	this.lastY = 0;
	// If height is defined, we already know height of line
	if(height != undefined){
		this.nextY = height;
	}
	else{ // otherwise calculate it
		this.nextY = this.getFontHeight();
	}
	this.lineHeight = this.nextY; // used in case line shrinks

	// Texture for webgl use
	//this.texture; // don't define yet
	this.texUpdate = false; // true if we need to retexture on word add
}

// This function draws an image to the SmartCanvas
// img is the image
// x is the x coordinate of the image in 2D canvas coordinates
// y is the y coordinate of the image in 2D canvas coordinates
// width is the width of the image
// height is the height of the image
// testval shows how to render image to canvas
// 	if 0: just render image
//	if 1: render on new line
//	if -1: create new canvas
SmartCanvas.prototype.drawImage = function(img, x, y, width, height, testval){
	var ctx = this.canvas.getContext("2d");
	
	
	var ctx = this.canvas.getContext("2d");
	var returnval = [this.lastX, this.lastY];
	// On this line
	if(testval === 0){
		ctx.drawImage(img, this.lastX, this.lastY, width, height);
		this.lastX += width;
	}
	// On next line
	else{
		this.lastX = 0;
		//this.lastY += this.nextY;
		this.lastY += this.nextY;
		this.nextY = height;
		//this.nextY = this.lineHeight;
		returnval = [this.lastX, this.lastY]; // update return val
		ctx.drawImage(img, this.lastX, this.lastY, width, height);
		this.lastX += width;
	}

	// Let renderer know this canvas has been edited since last texture
	this.texUpdate = true;

	// return [x,y] start location of text
	return returnval;
}

// This function tests if an image will fit to the SmartCanvas
// width is the width of the image
// height is the height of the image
// returns -1 is a new canvas is needed
//	1 if a newline is needed
//	0 if can just be rendered
SmartCanvas.prototype.testImage = function(width, height){
	var ctx = this.canvas.getContext("2d");
	//New canvas needed? eg. font size change
	if(this.canvas.height < height + this.lastY){ // is there room this line?
		return -1; // new canvas
	}

	if((this.canvas.width - this.lastX) < width){ // new line needed?
		if(this.canvas.height < this.lastY+ this.nextY + height){ // is there room next line?
			return -1; // new canvas
		}
		else{
			return 1; // new line
		}
	}
	else{ // just write
		return 0;
	}
}

// This function tests if there is room for a word on the SmartCanvas
// text is the word to be tested
// returns -1 is a new canvas is needed
//	1 if a newline is needed
//	0 if can just be rendered
SmartCanvas.prototype.testWord = function(text){
	var ctx = this.canvas.getContext("2d");
	//New canvas needed? eg. font size change
	if(this.canvas.height < this.nextY + this.lastY){ // is there room this line?
		return -1; // new canvas
	}

	if((this.canvas.width - this.lastX) < ctx.measureText(text).width){ // new line needed?
		if(this.canvas.height < this.lastY+ this.nextY + this.nextY){ // is there room next line?
			return -1; // new canvas
		}
		else{
			return 1; // new line
		}
	}
	else{ // just write
		return 0;
	}
}

// WriteWord() writes a word to canvas in next available space
// returns canvas coordinates the word is located [x, y]
// To find quadrilateral: width, height, lastX, nextY
SmartCanvas.prototype.writeWord = function(text, testval){
	var ctx = this.canvas.getContext("2d");
	var wordWidth = ctx.measureText(text).width;
	var returnval = [this.lastX, this.lastY];
	// On this line
	if(testval === 0){
		ctx.fillText(text, this.lastX, this.lastY);
		this.lastX += wordWidth;
	}
	// On next line
	else{
		this.lastX = 0;
		//this.lastY += this.nextY;
		this.lastY += this.nextY;
		this.nextY = this.lineHeight;
		//this.nextY = this.lineHeight;
		returnval = [this.lastX, this.lastY]; // update return val
		ctx.fillText(text, this.lastX, this.lastY);
		this.lastX += wordWidth;
	}

	// Let renderer know this canvas has been edited since last texture
	this.texUpdate = true;

	// return [x,y] start location of text
	return returnval;
}

// This function changes the font of a SmartCanvas
// font is the font to be changed
// This function changes the font and then updates info of the SmartCanvas
// Makes sure the height info stays correct once font is changed
SmartCanvas.prototype.changeFont = function(font){
	//console.log("changefont: "+font);
	this.font = font;
	var ctx = this.canvas.getContext("2d");
	ctx.textBaseline="top"; //*** CRUCIAL CODE *** makes alignment standard
	ctx.font = font;

	// Make sure to update nextY if font size is smaller
	var tempHeight = this.getFontHeight();
	this.lineHeight = tempHeight;
	if(this.nextY < tempHeight){
		this.nextY = tempHeight;
	}
}

// This function changes the text color of a SmartCanvas
// color is the color to be changed to
SmartCanvas.prototype.changeColor = function(color){
	var ctx = this.canvas.getContext("2d");
	ctx.fillStyle = color;
}

// This function returns the font of a SmartCanvas
SmartCanvas.prototype.returnFont = function(){
	return(this.font);
}

// This function returns the text color of a SmartCanvas
SmartCanvas.prototype.returnColor = function(){
	return(this.canvas.getContext("2d").fillStyle);
}

//		getFontHeight() gets height of font when font is changed
// Adapted from this stackoverflow answer by Michaelangelo:
//http://stackoverflow.com/questions/11452022/measure-text-height-on-an-html5-canvas-element
// 1) create div with word and font used in canvas
// 2) measure div
// 3) remove div
SmartCanvas.prototype.getFontHeight = function(){
	//console.log("getfontheight: "+this.font);
	var div = document.createElement("div");
	div.style.position = 'absolute'; // required for making div start out small as possible
	//div.style.left = '-999px';
	//div.style.top = '-999px';
	div.innerHTML = "Hg"; // High and Low letters. Also mercury.
	//var ctx = this.canvas.getContext("2d");
	var font = "font: "+this.font+";";
	div.setAttribute("style", font);
	document.body.appendChild(div);
	var size = [div.offsetWidth, div.offsetHeight]; // keep this in case width is needed later
	document.body.removeChild(div);
	return size[1];
}

// This function saves a WebGL texture to this.texture
// Without a texture, we cannot render textures
// gl is the webgl program in use
SmartCanvas.prototype.saveTexture = function(gl){
	// Create a new texture only once
	if(!this.texture){
		// create texture here	
		this.texture = gl.createTexture();   // Create a texture object
		//numTexCreate++;
			if (!this.texture) {
				console.log('Failed to create the texture object');
				return false;
			}
		}
		
	
	// Update texture only when needed
	if(this.texUpdate === true){
		// Ready texture binding
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
		//gl.activeTexture(gl.TEXTURE0); // Enable texture unit0
		gl.bindTexture(gl.TEXTURE_2D, this.texture); // Bind the texture object to the target

		// Set the texture properties
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		// Set the texture canvas
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
		//numTexLoad++;
		
		// Mark as updated
		this.texUpdate = false;
	}
}
