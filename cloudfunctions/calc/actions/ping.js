// cloudfunctions/<module>/actions/ping.js
module.exports = async () => {
  return {
    pong: true,
    ts: Date.now(),
  }
}