class NearestSymbol {
  constructor(symbols) {
    this.symbols = symbols;
  }
  
  // This is the trivial algorithm, but will be executed at most 2*(28+32) times, so whatever
  static hammingDistance(a, b) {
    let result = 0;
    while (a !== 0 || b !== 0) {
      if ((a & 1) !== (b & 1)) {
        result++;
      }
      
      a >>= 1;
      b >>= 1;
    }
    
    return result;
  }
  
  decode(input) {
    // Version and format info coding can correct 3 errors, so if delta is larger than that, meh
    let bestError = 4;
    let bestData = null;
    
    for (let [data, symbol] of this.symbols) {
      let error = NearestSymbol.hammingDistance(symbol, input);
      if (error < bestError) {
        bestData = data;
        bestError = error;
      }
    }
    
    return bestData;
  }
}

NearestSymbol.FORMAT_INFO = new NearestSymbol([
  [0x00, 0x5412],
  [0x01, 0x5125],
  [0x02, 0x5E7C],
  [0x03, 0x5B4B],
  [0x04, 0x45F9],
  [0x05, 0x40CE],
  [0x06, 0x4F97],
  [0x07, 0x4AA0],
  [0x08, 0x77C4],
  [0x09, 0x72F3],
  [0x0A, 0x7DAA],
  [0x0B, 0x789D],
  [0x0C, 0x662F],
  [0x0D, 0x6318],
  [0x0E, 0x6C41],
  [0x0F, 0x6976],
  [0x10, 0x1689],
  [0x11, 0x13BE],
  [0x12, 0x1CE7],
  [0x13, 0x19D0],
  [0x14, 0x0762],
  [0x15, 0x0255],
  [0x16, 0x0D0C],
  [0x17, 0x083B],
  [0x18, 0x355F],
  [0x19, 0x3068],
  [0x1A, 0x3F31],
  [0x1B, 0x3A06],
  [0x1C, 0x24B4],
  [0x1D, 0x2183],
  [0x1E, 0x2EDA],
  [0x1F, 0x2BED]]);

NearestSymbol.VERSION_INFO = new NearestSymbol([
  [7,  0x07C94],
  [8,  0x085BC],
  [9,  0x09A99],
  [10, 0x0A4D3],
  [11, 0x0BBF6],
  [12, 0x0C762],
  [13, 0x0D847],
  [14, 0x0E60D],
  [15, 0x0F928],
  [16, 0x10B78],
  [17, 0x1145D],
  [18, 0x12A17],
  [19, 0x13532],
  [20, 0x149A6],
  [21, 0x15683],
  [22, 0x168C9],
  [23, 0x177EC],
  [24, 0x18EC4],
  [25, 0x191E1],
  [26, 0x1AFAB],
  [27, 0x1B08E],
  [28, 0x1CC1A],
  [29, 0x1D33F],
  [30, 0x1ED75],
  [31, 0x1F250],
  [32, 0x209D5],
  [33, 0x216F0],
  [34, 0x228BA],
  [35, 0x2379F],
  [36, 0x24B0B],
  [37, 0x2542E],
  [38, 0x26A64],
  [39, 0x27541],
  [40, 0x28C69],
]);