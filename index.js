const http = require("http");
const multiparty = require("multiparty");
const path = require("path");
const fse = require("fs-extra");
const fs = require("fs");

const UPLOAD_DIR = path.resolve(__dirname, ".", "qiepian");

const server = http.createServer((req, res) => {
  // 获取请求的文件路径
  const filePath = path.join(
    __dirname,
    "public",
    req.url === "/" ? "index.html" : req.url
  );

  // 获取文件的扩展名
  const extname = path.extname(filePath);

  // 定义文件类型
  let contentType = "text/html";
  switch (extname) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".css":
      contentType = "text/css";
      break;
    case ".json":
      contentType = "application/json";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".jpg":
      contentType = "image/jpg";
      break;
  }

  // 读取文件
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code == "ENOENT") {
        // 文件不存在，返回 404 错误
        fs.readFile(
          path.join(__dirname, "public", "404.html"),
          (err, content) => {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(content, "utf-8");
          }
        );
      } else {
        // 其他错误，返回 500 错误
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // 文件存在，返回请求的文件
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.on("request", async (req, res) => {
  // 处理跨域
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // 分片上传
  if (req.url === "/upload") {
    const multipart = new multiparty.Form(); // 解析 FormData 对象
    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        return;
      }
      console.log("fields = ", fields);
      console.log("files = ", files);

      const [file] = files.file;
      const [fileName] = fields.fileName;
      const [chunkName] = fields.chunkName;
      // 在qiepian目录下创建一个新的文件夹，存放接收到的所有切牌呢
      const chunkDir = path.resolve(UPLOAD_DIR, `${fileName}-chunks`);
      if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir);
      }

      //把切片移动到chunkDir
      await fse.move(file.path, `${chunkDir}/${chunkName}`);
      res.end(
        JSON.stringify({
          code: 0,
          message: "切片上传成功",
        })
      );
    });
  }

  // 分片合并
  if (req.url === "/merge") {
    const data = await resolvePost(req); //
    const { fileName, size } = data;
    const filePath = path.resolve(UPLOAD_DIR, fileName); // 获取切片路径
    await mergeFileChunk(filePath, fileName, size);
    res.end(
      JSON.stringify({
        code: 0,
        message: "文件合并成功",
      })
    );
  }
});

async function mergeFileChunk(filePath, fileName, size) {
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileName}-chunks`);

  let chunkPaths = await fse.readdir(chunkDir);
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);

  const arr = chunkPaths.map((chunkPath, index) => {
    return pipeStream(
      path.resolve(chunkDir, chunkPath),
      // 在指定的位置创建可写流
      fse.createWriteStream(filePath, {
        start: index * size,
        end: (index + 1) * size,
      })
    );
  });
  await Promise.all(arr); //保证所有的切片都被读取
}

// 将切片转换成流进行合并
function pipeStream(path, writeStream) {
  return new Promise((resolve) => {
    // 创建可读流，读取所有切片
    const readStream = fse.createReadStream(path);
    readStream.on("end", () => {
      fse.unlinkSync(path); //读取完毕后，删除已经读取过的切片路径
      resolve();
    });
    readStream.pipe(writeStream); //将可读流流入可写流
  });
}

function resolvePost(req) {
  // 解析参数
  return new Promise((resolve) => {
    let chunk = "";
    req.on("data", (data) => {
      chunk += data;
    });
    req.on("end", () => {
      resolve(JSON.parse(chunk)); // 将字符串转为 JSON 对象
    });
  });
}

server.listen(3000, () => {
  console.log("服务已启动, 端口号为 3000");
});
