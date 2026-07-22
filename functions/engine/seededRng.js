// Mulberry32 seeded random number generator
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Generates a random seed (32-bit integer)
function generateSeed() {
  return Math.floor(Math.random() * 2147483647);
}

module.exports = {
  mulberry32,
  generateSeed
};
