"use strict";

// Decodes the bits in the QR code. Needs a matrix of bits and the format info.
class QRDecoder {
  constructor(moduleMatrix, formatInfo) {
    this.matrix = moduleMatrix;
    this.formatInfo = formatInfo;
    this.version = (this.matrix.size - 17) / 4;
  }
  
  process() {
    // Mark function modules in the QR code. Since we at most have 177x177 modules, this approach
    // is not *too* wasteful, and is simple enough.
    let functionMatrix = this.makeFunctionMatrix();
    let debug = DebugImage.image("sampling");
    let debugDisp = {x: 2, y: 2};
    if (debug.enabled) {
      for (let y = 0; y < this.matrix.size; y++) {
        for (let x = 0; x < this.matrix.size; x++) {
          let rgb = functionMatrix[x][y] ? [0, 255, 0] : [255, 0, 255];
          debug.dot(x*5 + debugDisp.x, y*5 + debugDisp.y, ...rgb, 0);
        }
      }
    }
    
    let bits = [];
    let ppt = null;
    let mask = DATA_MASKS[this.formatInfo.mask];
    for (let pt of this.bitSnake()) {
      if (!functionMatrix[pt.x][pt.y]) {
        continue;
      }
      
      if (ppt !== null) {
        debug.line(new Vec(ppt.x, ppt.y).scale(5).add(debugDisp), new Vec(pt.x, pt.y).scale(5).add(debugDisp), 255, 0);
      }
      
      let imageValue = this.matrix.get(pt.x, pt.y);
      if (mask(pt.x, pt.y)) {
        imageValue = 1 - imageValue;
      }
      
      bits.push(imageValue);
      ppt = pt;
    }

    // It is, strictly speaking, not necessary to materialize the list of bytes, but it sure is
    // useful for debugging and performance is probably not that big of an issue.
    let bytes = Array.from(this.getBytes(bits[Symbol.iterator]()));
    
    console.log("Bytes in pattern:");
    console.log(bytes);
      let blocks = this.computeBlocks(bytes[Symbol.iterator](),
       CODE_BLOCKS[this.formatInfo.errorCorrection + this.version].blocks);

    let errorCorrectedBytes = [];
    console.log("Error correction blocks:");
    console.log(blocks);
    for (let block of blocks) {
     let terms = block.terms.slice().reverse();
     let decoded = RSCodec.decode(Poly.create(GF256, terms), block.n, block.k);
     for (let i = block.n - 1; i >= 0; i--) {
       // Poly cuts off zeros from the beginning of the polynomial (highest power coefficients)
       errorCorrectedBytes.push(i < decoded.terms.length ? decoded.terms[i].v : 0);
     }
    }

    console.log("Bytes after error correction:");
    console.log(errorCorrectedBytes);
    let dataBits = this.bytesToBits(errorCorrectedBytes[Symbol.iterator]());
    
    let result = "";
    while (true) {
      // TODO(lberki): The standard says that the final zero bits are not added when there is not
      // enough space for them in the QR code.
      let mode = this.getBits(dataBits, 4);
      if (!(mode in QRDecoder.MODE_FUNCTIONS)) {
        throw "Unknown mode " + mode;
      }
     
      if (QRDecoder.MODE_FUNCTIONS[mode] === null) {
        // Terminator
        break;
      }
     
      result += QRDecoder.MODE_FUNCTIONS[mode].apply(this, [dataBits]);
    }
    
    console.log("Decoding result: " + result);
    return result;
  }
  
  decodeNumeric(bits) {
    let lengthBits;
    if (this.version <= 9) {
      lengthBits = 10;
    } else if (this.version <= 26) {
      lengthBits = 12;
    } else {
      lengthBits = 14;
    }
    
    let length = this.getBits(bits, lengthBits);
    console.log("Decoding " + length + " numbers");
    let result = "";
    for (let i = 0; i < Math.floor(length / 3); i++) {
      // Javascript type coercions are confusing, but this time, they sure are useful
      result += this.getBits(bits, 10);
    }
    
    if (length % 3 == 1) {
      result += this.getBits(bits, 4);
    } else if (length % 3 == 2) {
      result += this.getBits(bits, 7);
    }
    
    console.log(result);
    return result;
  }
  
  decodeAlphanumeric(bits) {
    let lengthBits;
    if (this.version <= 9) {
      lengthBits = 9;
    } else if (this.version <= 26) {
      lengthBits = 11;
    } else {
      lengthBits = 13;
    }
    
    let length = this.getBits(bits, lengthBits);
    let result = "";
    console.log("Decoding " + length + " alphanumeric symbols");
    for (let i = 0; i < Math.floor(length / 2); i++) {
      let number = this.getBits(bits, 11);
      result += ALPHANUMERIC_TABLE[Math.floor(number / 45)] + ALPHANUMERIC_TABLE[number % 45];
    }
    
    if (length % 2 === 1) {
      result += ALPHANUMERIC_TABLE[this.getBits(bits, 6)];
    }
    
    console.log(result);
    return result;
  }
  
  decodeByte(bits) {
    // TODO(lberki): This can be UTF-8. Do I really have to write a UTF-8 autodetector?
    let lengthBits;
    if (this.version <= 9) {
      lengthBits = 8;
    } else {
      lengthBits = 16;
    }
    
    let length = this.getBits(bits, lengthBits);
    let result = "";
    console.log("Decoding " + length + " bytes");
    for (let i = 0; i < length; i++) {
      let code = this.getBits(bits, 8);
      result += String.fromCharCode(code);
    }
    
    console.log(result);
    return result;
  }
  
  decodeKanji(bits) {
    throw "Kanji not implemented";
  }
  
  decodeStructuredAppend(bits) {
    throw "Structured Append not implemented";
  }
  
  decodeFNC1(bits) {
    throw "FNC1 not implemented";
  }
  
  getBits(bits, count) {
    let result = 0;
    for (let i = 0; i < count; i++) {
      result = (result << 1) + bits.next().value;
    }
    
    return result;
  }
  
  * bytesToBits(bytes) {
      for (let byte of bytes) {
        for (let i = 0; i < 8; i++) {
          yield (byte & 128) >> 7;
          byte <<= 1;
        }
      }
  }
  
  // De-interleave Reed-Solomon blocks from the byte stream
  computeBlocks(bytes, codeDescription) {
    let result = [];
    
    // First create the result array
    let allCodewords = 0;
    for (let [ecSymbols, blocks, dataSymbols] of codeDescription) {
      for (let i = 0; i < blocks; i++) {
        result.push({k: ecSymbols, n: dataSymbols, terms: []});
      }
    }
    
    // Then fill in the data codewords
    let fillTerms = (symbolCountFn) => {
      let doneSomething = true;
      for (let i = 0; doneSomething; i++) {
        doneSomething = false;
        let firstBlock = 0;
        for (let [ecSymbols, blockCount, dataSymbols] of codeDescription) {
          if (i < symbolCountFn(ecSymbols, dataSymbols)) {
            doneSomething = true;
            for (let i = 0; i < blockCount; i++) {
              result[firstBlock + i].terms.push(bytes.next().value);
            }
          }
          
          firstBlock += blockCount;
        }
      }
    };
    
    fillTerms((ecSymbols, dataSymbols) => dataSymbols);
    fillTerms((ecSymbols, dataSymbols) => ecSymbols);
    return result;
  }
  
  * getBytes(bits) {
    while (true) {
      let acc = 0;
      for (let i = 0; i < 8; i++) {
        let next = bits.next();
        if (next.done) {
          return;
        }
        acc = (acc << 1) + next.value;
      }
      
      yield acc;
    }
  }
  
  // Returns a list of (x, y) pairs of the coordinates of data modules in the QR code in the
  // specified "snake" pattern. Does not avoid function modules.
  * bitSnake() {
    let backAndForths = (this.matrix.size - 1) / 4;
    for (let i = backAndForths - 1; i >= 0; i--) {
      let x = i * 4 + 2;
      if (i > 0) {
        x += 1;  // Avoid the vertical timing pattern
      }
      for (let y = this.matrix.size - 1; y >= 0; y--) {
        yield {x: x+1, y: y};
        yield {x: x, y: y};
      }
      
      x = i * 4;
      if (i > 1) {
        x += 1;  // Avoid the vertical timing pattern
      }
      for (let y = 0; y < this.matrix.size; y++) {
        yield {x: x+1, y: y};
        yield {x: x, y: y};
      }
    }
  }
  
  makeFunctionMatrix() {
    let result = [];
    for (let i = 0; i < this.matrix.size; i++) {
      result.push(new Array(this.matrix.size).fill(true));
    }
    
    // Top-left finder pattern + format info
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        result[x][y] = false;
      }
    }
    
    // Top-right finder pattern + format info
    for (let y = 0; y < 9; y++) {
      for (let x = this.matrix.size - 8; x < this.matrix.size; x++) {
        result[x][y] = false;
      }
    }
    
    // Bottom-right finder pattern + format info
    for (let y = this.matrix.size - 8; y < this.matrix.size; y++) {
      for (let x = 0; x < 9; x++) {
        result[x][y] = false;
      }
    }
    
    // Timing patterns
    for (let i = 0; i < this.matrix.size; i++) {
      result[i][6] = false;
      result[6][i] = false;
    }
    
    // Top-right and bottom-left version info
    if (this.version >= 7) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
          result[i][this.matrix.size - 9 - j] = false;
          result[this.matrix.size - 9 - j][i] = false;
        }
      }
    }
    
    // Alignment patterns
    for (let y of ALIGNMENT_PATTERN_LOCATIONS[this.version]) {
      for (let x of ALIGNMENT_PATTERN_LOCATIONS[this.version]) {
        // Ignore alignment patterns that overlap with finder patterns
        if (x === 6 && y === 6) {
          continue;
        }
        
        if ((x === 6 && y === this.matrix.size - 7) || (x === this.matrix.size - 7 && y === 6)) {
          continue;
        }
        
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            result[x + dx][y + dy] = false;
          }
        }
      }
    }
    
    // Dark module (why does that exist?)
    result[8][this.version * 4 + 9] = false;
    return result;
  }
}

QRDecoder.MODE_FUNCTIONS = {
  0b0000: null,
  0b0001: QRDecoder.prototype.decodeNumeric,
  0b0010: QRDecoder.prototype.decodeAlphanumeric,
  0b0100: QRDecoder.prototype.decodeByte,
  0b1000: QRDecoder.prototype.decodeKanji,
  0b0011: QRDecoder.prototype.decodeStructuredAppend,
  0b0101: QRDecoder.prototype.decodeFNC1,
  0b1001: QRDecoder.prototype.decodeFNC1,
}
  