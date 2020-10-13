"use strict";

// Does not work:
// - dark, dark2 (too much noise, cannot find finder pattern)
// - tiny, tiny2 (cannot find top right finder pattern, binarization is botched)
// - xl (vertical / horizontal lines cannot be fit)
// - hugeflat2 (barrel distortion by more than one module, perspective correction doesn't help)

// TODO:
// line fitting doesn't work if the line is horizontal or vertical
// Use alignment patterns to counteract module skewing for very large codes

let origImage;

function videoPlaying() {
  let video = document.getElementById("viewfinder");
  console.log("Video started, dimensions: " + video.videoWidth + "x" + video.videoHeight);
}

async function startViewfinder() {
  let stream = await navigator.mediaDevices.getUserMedia(
    { video: { width: { min: 640 }, height: { min: 480 } } },
    { audio: false});
  let video = document.getElementById("viewfinder");
  video.srcObject = stream;
  video.play();
  video.addEventListener("playing", videoPlaying, false);
}

function onLoad() {
  startViewfinder();
  let viewfinder = document.getElementById("viewfinder");
  Debug.init();
  
  window.addEventListener("keypress", ev => {
    switch (ev.key) {
    case " ":
      takeSnapshot();
      processCurrentImage();
      ev.preventDefault();
      break;

    case "a":
      takeSnapshot();
      ev.preventDefault();
      break;
    }
  });
}

function processCurrentImage() {
  let result = QRReader.process(origImage);
  if (result === null) {
    return;
  }
  
  let resultNode = document.getElementById("result");
  while (resultNode.hasChildNodes()) {
    resultNode.removeChild(resultNode.lastChild);
  }
  
  resultNode.appendChild(document.createTextNode(result));
}

function takeSnapshot() {
  let video = document.getElementById("viewfinder");
  let canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  let context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  let imageData = context.getImageData(0, 0, video.videoWidth, video.videoHeight);
  origImage = new Bitmap(imageData.data, video.videoWidth, video.videoHeight, 4);
  DebugImage.clear();
  DebugImage.setBaseBitmap(origImage);
  let debug = DebugImage.fromBitmap("snapshot", origImage);
  debug.draw();
}

