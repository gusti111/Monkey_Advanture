const http = require('http');
const files = ['/', '/js/main.js', '/js/gameManager.js', '/js/uiManager.js', '/js/entities/obstacles.js', '/css/style.css'];
let pending = files.length;
files.forEach(p => {
  http.get({ host: 'localhost', port: 8080, path: p }, res => {
    console.log(p, res.statusCode);
    res.resume();
    if (--pending === 0) process.exit(0);
  }).on('error', e => {
    console.error(p, 'ERR', e.code || e.message);
    process.exit(2);
  });
});
