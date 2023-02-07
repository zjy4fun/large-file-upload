const http = require('http');
const multiparty = require('multiparty');
const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');

const UPLOAD_DIR = path.resolve(__dirname, '.', 'qiepian');

const server = http.createServer((req, res) => {
	// 获取请求的文件路径
  const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

  // 获取文件的扩展名
  const extname = path.extname(filePath);

  // 定义文件类型
  let contentType = 'text/html';
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }

  // 读取文件
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == 'ENOENT') {
        // 文件不存在，返回 404 错误
        fs.readFile(path.join(__dirname, 'public', '404.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // 其他错误，返回 500 错误
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // 文件存在，返回请求的文件
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.on('request', async(req, res) => {
	// 处理跨域
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', '*');
	
	// 前端访问的地址正确
	if(req.url === '/upload'){
		const multipart = new multiparty.Form() // 解析 FormData 对象
		multipart.parse(req, async(err, fields, files) => {
			if(err){
				return ;
			}
			console.log('fields = ' , fields);
			console.log('files = ', files);
			
			const [file] = files.file;
			const [fileName] = fields.fileName;
			const [chunkName] = fields.chunkName;
			// 在qiepian目录下创建一个新的文件夹，存放接收到的所有切牌呢
			const chunkDir = path.resolve(UPLOAD_DIR, `${fileName}-chunks`)
			if(!fse.existsSync(chunkDir)) {
				await fse.mkdirs(chunkDir);
			}

			//把切片移动到chunkDir
			await fse.move(file.path, `${chunkDir}/${chunkName}`);
			res.end(JSON.stringify({
				code: 0,
				message: '切片上传成功'
			}))
		})
	}
})

server.listen(3000, () => {
	console.log('服务已启动, 端口号为 3000');
})
