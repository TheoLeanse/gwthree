function mainLoop() {
    requestAnimationFrame(mainLoop);
    DEMO.update();
}

document.addEventListener("DOMContentLoaded", function() {
//	WINDOW.initialize();

	DEMO.initialize('canvas-3d');

//	WINDOW.resizeCallback = function(inWidth, inHeight) { DEMO.resize(inWidth, inHeight); };
//	DEMO.resize(WINDOW.ms_Width, WINDOW.ms_Height);

    mainLoop();
});

////////////////

var DEMO = {
	ms_Canvas: null,
	ms_Renderer: null,
	ms_Camera: null,
	ms_Scene: null,
	ms_Controls: null,
	ms_Water: null,

    enable: (function enable() {
        console.log('enable')
        try {
            var aCanvas = document.createElement('canvas');
            return !! window.WebGLRenderingContext && (aCanvas.getContext('webgl') || aCanvas.getContext('experimental-webgl'));
        }
        catch(e) {
            return false;
        }
    })(),

	initialize: function initialize(inIdCanvas) {
        console.log('initialize')
		this.ms_Canvas = document.querySelector('#'+inIdCanvas);
        console.log(this)
		// Initialize Renderer, Camera and Scene
		this.ms_Renderer = this.enable? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
		this.ms_Canvas.appendChild(this.ms_Renderer.domElement); //
		this.ms_Scene = new THREE.Scene();

		this.ms_Camera = new THREE.PerspectiveCamera(55.0, 1.806775, 0.5, 3000000);
		this.ms_Camera.position.set(50, 50, 50); // 50, 50, 50 // 500 500 500
		this.ms_Camera.lookAt(new THREE.Vector3(0, 0, 0));

		// Initialize Orbit control
	//	this.ms_Controls = new THREE.OrbitControls(this.ms_Camera, this.ms_Renderer.domElement);

		// Add light
		var directionalLight = new THREE.DirectionalLight(0xffff55, 1);
		directionalLight.position.set(-600, 300, 600);
		this.ms_Scene.add(directionalLight);

		// Load textures
		var waterNormals = new THREE.ImageUtils.loadTexture('./gw.jpg'); // waternormals.jpg
		waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

		// Create the water effect
		this.ms_Water = new THREE.Water(this.ms_Renderer, this.ms_Camera, this.ms_Scene, {
			textureWidth: 2256,
			textureHeight: 2256,
			waterNormals: waterNormals,
			alpha: 	1.0,
			sunDirection: directionalLight.position.normalize(),
			sunColor: 0xFF6699,
			waterColor: 0xFF6699,
			betaVersion: 0,
			side: THREE.DoubleSide
		});
		var aMeshMirror = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(4500, 2000, 10, 10),
			this.ms_Water.material
		);
		aMeshMirror.add(this.ms_Water);
		aMeshMirror.rotation.x = - Math.PI * 0.5;

		this.ms_Scene.add(aMeshMirror);

		this.loadSkyBox();
	},

	loadSkyBox: function loadSkyBox() {
		var aCubeMap = THREE.ImageUtils.loadTextureCube([
		  '../demo/assets/img/px.jpg',
		  '../demo/assets/img/nx.jpg',
		  '../demo/assets/img/py.jpg',
		  '../demo/assets/img/ny.jpg',
		  '../demo/assets/img/pz.jpg',
		  '../demo/assets/img/nz.jpg'
		]);
		aCubeMap.format = THREE.RGBFormat;

		var aShader = THREE.ShaderLib['cube'];
		aShader.uniforms['tCube'].value = aCubeMap;

		var aSkyBoxMaterial = new THREE.ShaderMaterial({
		  fragmentShader: aShader.fragmentShader,
		  vertexShader: aShader.vertexShader,
		  uniforms: aShader.uniforms,
		  depthWrite: false,
		  side: THREE.BackSide
		});

		var aSkybox = new THREE.Mesh(
		  new THREE.BoxGeometry(1000000, 1000000, 1000000),
		  aSkyBoxMaterial
		);

		//this.ms_Scene.add(aSkybox);
	},

    display: function display() {
		this.ms_Water.render();
		this.ms_Renderer.render(this.ms_Scene, this.ms_Camera);
	},

	update: function update() {
		this.ms_Water.material.uniforms.time.value += 1.0 / 60.0;
		//this.ms_Controls.update();
		this.display();
	},

	resize: function resize(inWidth, inHeight) {
		this.ms_Camera.aspect =  inWidth / inHeight;
		this.ms_Camera.updateProjectionMatrix();
		this.ms_Renderer.setSize(inWidth, inHeight);
		this.ms_Canvas.html(this.ms_Renderer.domElement);
		this.display();
	}
};

/////

/**
 * @author jbouny / https://github.com/jbouny
 *
 * Work based on :
 * @author Slayvin / http://slayvin.net : Flat mirror for three.js
 * @author Stemkoski / http://www.adelphi.edu/~stemkoski : An implementation of water shader based on the flat mirror
 * @author Jonas Wagner / http://29a.ch/ && http://29a.ch/slides/2012/webglwater/ : Water shader explanations in WebGL
 */

THREE.ShaderLib['water'] = {

  uniforms: THREE.UniformsUtils.merge( [
    THREE.UniformsLib[ "fog" ], {
      "normalSampler":    { type: "t", value: null },
      "mirrorSampler":    { type: "t", value: null },
      "alpha":            { type: "f", value: 1.0 },
      "time":             { type: "f", value: 0.0 },
      "distortionScale":  { type: "f", value: 20.0 },
      "noiseScale":       { type: "f", value: 1.0 },
      "textureMatrix" :   { type: "m4", value: new THREE.Matrix4() },
      "sunColor":         { type: "c", value: new THREE.Color(0x7F7F7F) },
      "sunDirection":     { type: "v3", value: new THREE.Vector3(0.70707, 0.70707, 0) },
      "eye":              { type: "v3", value: new THREE.Vector3(0, 0, 0) },
      "waterColor":       { type: "c", value: new THREE.Color(0x555555) }
    }
  ] ),

  vertexShader: [
    'uniform mat4 textureMatrix;',
    'uniform float time;',

    'varying vec4 mirrorCoord;',
    'varying vec3 worldPosition;',
    'varying vec3 modelPosition;',
    'varying vec3 surfaceX;',
    'varying vec3 surfaceY;',
    'varying vec3 surfaceZ;',

    'void main()',
    '{',
    '  mirrorCoord = modelMatrix * vec4(position, 1.0);',
    '  worldPosition = mirrorCoord.xyz;',
    '  modelPosition = position;',
    '  surfaceX = vec3( modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2]);',
    '  surfaceY = vec3( modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2]);',
    '  surfaceZ = vec3( modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2]);',

    '  mirrorCoord = textureMatrix * mirrorCoord;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D mirrorSampler;',
    'uniform float alpha;',
    'uniform float time;',
    'uniform float distortionScale;',
    'uniform float noiseScale;',
    'uniform sampler2D normalSampler;',
    'uniform vec3 sunColor;',
    'uniform vec3 sunDirection;',
    'uniform vec3 eye;',
    'uniform vec3 waterColor;',

    'varying vec4 mirrorCoord;',
    'varying vec3 worldPosition;',
    'varying vec3 modelPosition;',
    'varying vec3 surfaceX;',
    'varying vec3 surfaceY;',
    'varying vec3 surfaceZ;',

    'void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, in float shiny, in float spec, in float diffuse, inout vec3 diffuseColor, inout vec3 specularColor)',
    '{',
    '  vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));',
    '  float direction = max(0.0, dot(eyeDirection, reflection));',
    '  specularColor += pow(direction, shiny) * sunColor * spec;',
    '  diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;',
    '}',

    'vec3 getNoise(in vec2 uv)',
    '{',
    '  vec2 uv0 = uv / (103.0 * noiseScale) + vec2(time / 17.0, time / 29.0);',
    '  vec2 uv1 = uv / (107.0 * noiseScale) - vec2(time / -19.0, time / 31.0);',
    '  vec2 uv2 = uv / (vec2(8907.0, 9803.0) * noiseScale) + vec2(time / 101.0, time /   97.0);',
    '  vec2 uv3 = uv / (vec2(1091.0, 1027.0) * noiseScale) - vec2(time / 109.0, time / -113.0);',
    '  vec4 noise = texture2D(normalSampler, uv0) +',
    '    texture2D(normalSampler, uv1) +',
    '    texture2D(normalSampler, uv2) +',
    '    texture2D(normalSampler, uv3);',
    '  return noise.xyz * 0.5 - 1.0;',
    '}',

    THREE.ShaderChunk[ "common" ],
    THREE.ShaderChunk[ "fog_pars_fragment" ],

    'void main()',
    '{',
    '  vec3 worldToEye = eye - worldPosition;',
    '  vec3 eyeDirection = normalize(worldToEye);',

    // Get noise based on the 3d position
    '  vec3 noise = getNoise(modelPosition.xy * 1.0);',
    '  vec3 distordCoord = noise.x * surfaceX + noise.y * surfaceY;',
    '  vec3 distordNormal = distordCoord + surfaceZ;',

    // Revert normal if the eye is bellow the mesh
    '  if(dot(eyeDirection, surfaceZ) < 0.0)',
    '    distordNormal = distordNormal * -1.0;',

    // Compute diffuse and specular light (use normal and eye direction)
    '  vec3 diffuseLight = vec3(0.0);',
    '  vec3 specularLight = vec3(0.0);',
    '  sunLight(distordNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);',

    // Compute final 3d distortion, and project it to get the mirror sampling
    '  float distance = length(worldToEye);',
    '  vec2 distortion = distordCoord.xy * distortionScale * sqrt(distance) * 0.07;',
    ' vec3 mirrorDistord = mirrorCoord.xyz + vec3(distortion.x, distortion.y, 1.0);',
    ' vec3 reflectionSample = texture2DProj(mirrorSampler, mirrorDistord).xyz;',

    // Compute other parameters as the reflectance and the water appareance
    '  float theta = max(dot(eyeDirection, distordNormal), 0.0);',
    '  float reflectance = 0.3 + (1.0 - 0.3) * pow((1.0 - theta), 3.0);',
    '  vec3 scatter = max(0.0, dot(distordNormal, eyeDirection)) * waterColor;',

    // Compute final pixel color
    '  vec3 albedo = mix(sunColor * diffuseLight * 0.3 + scatter, (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), reflectance);',

    ' vec3 outgoingLight = albedo;',
    THREE.ShaderChunk[ "fog_fragment" ],

    ' gl_FragColor = vec4( outgoingLight, alpha );',
    '}'
  ].join('\n')

};

THREE.Water = function (renderer, camera, scene, options) {

  THREE.Object3D.call(this);
  this.name = 'water_' + this.id;

  function optionalParameter (value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  };

  options = options || {};

  this.matrixNeedsUpdate = true;

  var width = optionalParameter(options.textureWidth, 512);
  var height = optionalParameter(options.textureHeight, 512);
  this.clipBias = optionalParameter(options.clipBias, -0.0001);
  this.alpha = optionalParameter(options.alpha, 1.0);
  this.time = optionalParameter(options.time, 0.0);
  this.normalSampler = optionalParameter(options.waterNormals, null);
  this.sunDirection = optionalParameter(options.sunDirection, new THREE.Vector3(0.70707, 0.70707, 0.0));
  this.sunColor = new THREE.Color(optionalParameter(options.sunColor, 0xffffff));
  this.waterColor = new THREE.Color(optionalParameter(options.waterColor, 0x7F7F7F));
  this.eye = optionalParameter(options.eye, new THREE.Vector3(0, 0, 0));
  this.distortionScale = optionalParameter(options.distortionScale, 20.0);
  this.noiseScale = optionalParameter(options.noiseScale, 1.0);
  this.side = optionalParameter(options.side, THREE.FrontSide);
  this.fog = optionalParameter(options.fog, false);

  this.renderer = renderer;
  this.scene = scene;
  this.mirrorPlane = new THREE.Plane();
  this.normal = new THREE.Vector3(0, 0, 1);
  this.cameraWorldPosition = new THREE.Vector3();
  this.rotationMatrix = new THREE.Matrix4();
  this.lookAtPosition = new THREE.Vector3(0, 0, -1);
  this.clipPlane = new THREE.Vector4();

  if ( camera instanceof THREE.PerspectiveCamera ) {
    this.camera = camera;
  }
  else  {
    this.camera = new THREE.PerspectiveCamera();
    console.log(this.name + ': camera is not a Perspective Camera!')
  }

  this.textureMatrix = new THREE.Matrix4();

  this.mirrorCamera = this.camera.clone();

  this.texture = new THREE.WebGLRenderTarget(width, height);
  this.tempTexture = new THREE.WebGLRenderTarget(width, height);

  var mirrorShader = THREE.ShaderLib["water"];
  var mirrorUniforms = THREE.UniformsUtils.clone(mirrorShader.uniforms);

  this.material = new THREE.ShaderMaterial({
    fragmentShader: mirrorShader.fragmentShader,
    vertexShader: mirrorShader.vertexShader,
    uniforms: mirrorUniforms,
    transparent: true,
    side: this.side,
    fog: this.fog
  });

  this.mesh = new THREE.Object3D();

  this.material.uniforms.mirrorSampler.value = this.texture;
  this.material.uniforms.textureMatrix.value = this.textureMatrix;
  this.material.uniforms.alpha.value = this.alpha;
  this.material.uniforms.time.value = this.time;
  this.material.uniforms.normalSampler.value = this.normalSampler;
  this.material.uniforms.sunColor.value = this.sunColor;
  this.material.uniforms.waterColor.value = this.waterColor;
  this.material.uniforms.sunDirection.value = this.sunDirection;
  this.material.uniforms.distortionScale.value = this.distortionScale;
  this.material.uniforms.noiseScale.value = this.noiseScale;

  this.material.uniforms.eye.value = this.eye;

  if ( !THREE.Math.isPowerOfTwo(width) || !THREE.Math.isPowerOfTwo(height) ) {
    this.texture.generateMipmaps = false;
    this.tempTexture.generateMipmaps = false;
  }
};

THREE.Water.prototype = Object.create(THREE.Object3D.prototype);

THREE.Water.prototype.renderWithMirror = function (otherMirror) {

  // update the mirror matrix to mirror the current view
  this.updateTextureMatrix();
  this.matrixNeedsUpdate = false;

  // set the camera of the other mirror so the mirrored view is the reference view
  var tempCamera = otherMirror.camera;
  otherMirror.camera = this.mirrorCamera;

  // render the other mirror in temp texture
  otherMirror.render(true);

  // render the current mirror
  this.render();
  this.matrixNeedsUpdate = true;

  // restore material and camera of other mirror
  otherMirror.camera = tempCamera;

  // restore texture matrix of other mirror
  otherMirror.updateTextureMatrix();
};

THREE.Water.prototype.updateTextureMatrix = function () {
  if ( this.parent !== undefined ) {
    this.mesh = this.parent;
  }
  function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

  this.updateMatrixWorld();
  this.camera.updateMatrixWorld();

  this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);

  this.rotationMatrix.extractRotation(this.matrixWorld);

  this.normal = (new THREE.Vector3(0, 0, 1)).applyEuler(this.mesh.rotation);
  var cameraPosition = this.camera.position.clone().sub( this.mesh.position );
  if ( this.normal.dot(cameraPosition) < 0 ) {
    var meshNormal = (new THREE.Vector3(0, 0, 1)).applyEuler(this.mesh.rotation);
    this.normal.reflect(meshNormal);
  }

  var view = this.mesh.position.clone().sub(this.cameraWorldPosition);
  view.reflect(this.normal).negate();
  view.add(this.mesh.position);

  this.rotationMatrix.extractRotation(this.camera.matrixWorld);

  this.lookAtPosition.set(0, 0, -1);
  this.lookAtPosition.applyMatrix4(this.rotationMatrix);
  this.lookAtPosition.add(this.cameraWorldPosition);

  var target = this.mesh.position.clone().sub(this.lookAtPosition);
  target.reflect(this.normal).negate();
  target.add(this.mesh.position);

  this.up.set(0, -1, 0);
  this.up.applyMatrix4(this.rotationMatrix);
  this.up.reflect(this.normal).negate();

  this.mirrorCamera.position.copy(view);
  this.mirrorCamera.up = this.up;
  this.mirrorCamera.lookAt(target);
  this.mirrorCamera.aspect = this.camera.aspect;

  this.mirrorCamera.updateProjectionMatrix();
  this.mirrorCamera.updateMatrixWorld();
  this.mirrorCamera.matrixWorldInverse.getInverse(this.mirrorCamera.matrixWorld);

  // Update the texture matrix
  this.textureMatrix.set(0.5, 0.0, 0.0, 0.5,
              0.0, 0.5, 0.0, 0.5,
              0.0, 0.0, 0.5, 0.5,
              0.0, 0.0, 0.0, 1.0);
  this.textureMatrix.multiply(this.mirrorCamera.projectionMatrix);
  this.textureMatrix.multiply(this.mirrorCamera.matrixWorldInverse);

  // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
  // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
  this.mirrorPlane.setFromNormalAndCoplanarPoint(this.normal, this.mesh.position);
  this.mirrorPlane.applyMatrix4(this.mirrorCamera.matrixWorldInverse);

  this.clipPlane.set(this.mirrorPlane.normal.x, this.mirrorPlane.normal.y, this.mirrorPlane.normal.z, this.mirrorPlane.constant);

  var q = new THREE.Vector4();
  var projectionMatrix = this.mirrorCamera.projectionMatrix;

  q.x = (sign(this.clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
  q.y = (sign(this.clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
  q.z = -1.0;
  q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

  // Calculate the scaled plane vector
  var c = new THREE.Vector4();
  c = this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(q));

  // Replacing the third row of the projection matrix
  projectionMatrix.elements[2] = c.x;
  projectionMatrix.elements[6] = c.y;
  projectionMatrix.elements[10] = c.z + 1.0 - this.clipBias;
  projectionMatrix.elements[14] = c.w;

  var worldCoordinates = new THREE.Vector3();
  worldCoordinates.setFromMatrixPosition(this.camera.matrixWorld);
  this.eye = worldCoordinates;
  this.material.uniforms.eye.value = this.eye;
};

THREE.Water.prototype.render = function (isTempTexture) {

  if ( this.matrixNeedsUpdate ) {
    this.updateTextureMatrix();
  }

  this.matrixNeedsUpdate = true;

  // Render the mirrored view of the current scene into the target texture
  if ( this.scene !== undefined && this.scene instanceof THREE.Scene ) {
    // Remove the mirror texture from the scene the moment it is used as render texture
    // https://github.com/jbouny/ocean/issues/7
    this.material.visible = false;

    var renderTexture = (isTempTexture !== undefined && isTempTexture)? this.tempTexture : this.texture;
    this.renderer.render(this.scene, this.mirrorCamera, renderTexture, true);

    this.material.visible = true;
    this.material.uniforms.mirrorSampler.value = renderTexture;
  }

};
