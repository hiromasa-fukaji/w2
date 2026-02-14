let pg;
let img;
let circleSizeSlider, circleSizeText;
let aspect, h, w;
let seed = -1;
let resnum = -1;
let coldiv = 3;
let maxMove = -1;
let noiseShift = -1;

function preload() {
	img = loadImage('vote.jpg');
}

function setup() {
	h = 1350;
	w = 1080;
	aspect = w / h;
	createCanvas(w, h);
	img.resize(w, h);
	colorMode(RGB);
	background(255);
	pixelDensity(1);
	setupUIs();
	setupBaseGraphics();
	updateUIs();
}

function draw(){
	updateUIs();
	drawCheckers();
}

function setupUIs(){
	circleSizeSlider = createSlider(5, 200, 40, 1);
	circleSizeSlider.position(30, 10);
  circleSizeSlider.size(200);
	circleSizeText = createP('');
	circleSizeText.position(230, -5);
}

function updateUIs(){
	if(resnum != circleSizeSlider.value()){
		resnum = circleSizeSlider.value();
		circleSizeText.elt.innerHTML = resnum;
	}
}

function setupBaseGraphics(){
	randomSeed(seed);
	pg = createGraphics(width, height, P2D);
	pg.noStroke();
	pg.pixelDensity(1);
}

function drawCheckers(){
	let offsetY = 100 * sin(frameCount * 0.1);
	pg.background(255);
	pg.image(img, 0, offsetY, width, height);
	pg.loadPixels();

	background(255);
	noStroke();
	let resnumX = resnum;
	let resnumY = resnum / aspect;
	let rows = resnumY;
	let cols = resnumX;
	let infos = Array.from({ length: rows }, () => Array(cols).fill(0));
	for(let i=0; i < resnumX; i++){
		for(let n=0; n < resnumY; n++){
			let xindex = round(min((i+0.5) * (width / resnumX), width));
			let yindex = round(min((n+0.5) * (height / resnumY), height));
			let index = min(xindex + yindex * pg.width, pg.pixels.length / 4-1);
			let col = color(pg.pixels[index*4], pg.pixels[index*4+1], pg.pixels[index*4+2]);
			let bri = brightness(col) / 100.0;
			let newCol = min(floor(bri * coldiv), coldiv-1);
			let x = i * width / resnumX;
			let y = n * height / resnumY;
			let sw = width / resnumX;
			let sh = height / resnumY;
			let nres = 0;
			if(newCol == 0){
				nres = 8;
				strokeWeight(sw * 0.02);
			}else if(newCol == 1){
				nres = 2;
				strokeWeight(sw * 0.1);
			}else if(newCol == 2){
				nres = 4;
				strokeWeight(sw * 0.06);
			}
			fill(color("#006AB8"));
			stroke(255);
			for(let s=0; s<nres; s++){
				for(let t=0; t<nres; t++){
					if(((s % 2) == 0 && (t % 2) == 0) || 
						 ((s % 2) == 1 && (t % 2) == 1)){
						let tw = sw / nres;
						let th = sh / nres;
						let tx = x + tw * s;
						let ty = y + th * t;
						rect(tx, ty, tw, th);
					}
				}
			}
		}
	}	
}
