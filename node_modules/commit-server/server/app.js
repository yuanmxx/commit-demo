#!/usr/bin/env node

const colors = require("colors");
colors.setTheme({ help: "cyan", warn: "red" });
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const path = require("path");
const { exec } = require("child_process");
const open = require("open");
const { handleCommit, getProjectBeforeCommitInfo } = require("./commit/commit");

const fileData = { commitEd: {}, pushEd: {} };

const readFile = (file) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, file), "utf-8");
    return JSON.parse(data.toString());
  } catch (error) {
    return {};
  }
};

const writeFile = (file, data) => {
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(data));
};

const handleCommitData = (data) => {
  const commitData = { ...JSON.parse(data) };
  let count = 0,
    commitArr = [],
    allCommitCount = 0,
    commitEdAmount = 0;

  for (let item in commitData) {
    commitData[item] -= fileData.commitEd[item] || 0;
    if (commitData[item] > 0) {
      commitArr[count++] = item;
      allCommitCount += commitData[item];
    } else {
      delete commitData[item];
    }
  }

  for (let item in fileData.pushEd) {
    commitEdAmount += fileData.pushEd[item] || 0;
  }

  console.log(commitData);

  return { commitArr, allCommitCount, commitEdAmount, commitData };
};

const handPushData = (data) => {
  return new Promise((resolve, reject) => {
    try {
      writeFile("./commit/push.json", JSON.parse(data));
      console.log("正在推送，请稍等...");
      console.log("温馨提示：推送成功后会打印成功提示哦，所以请耐心等待呢。");
      const cmd = `git push`;
      exec(
        cmd,
        {
          encoding: "utf8",
          cwd: null,
          env: undefined,
        },
        (error, stdout, stderr) => {
          if (error) {
            console.log(`错误信息:${error}`, stderr);
            return;
          }
          console.log(stdout);
          console.log("推送成功");
          writeFile("./commit/commit.json", {});
          resolve();
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};

app.all("*", function (_, response, next) {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  response.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  response.header("X-Powered-By", "nodejs");
  next();
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.post("/commit/getSaveData", function (_, response) {
  const data = readFile("./commit/save.json");
  response.send({
    code: 200,
    msg: "获取成功",
    data: JSON.stringify(data),
  });
});

app.post("/commit/setSaveData", function (request, response) {
  const { data } = request.body;
  writeFile("./commit/save.json", JSON.parse(data));
  response.send({
    code: 200,
    msg: "保存成功",
  });
});

app.post("/commit/getCommitData", function (_, response) {
  const data = readFile("./commit/commit.json");
  fileData.commitEd = data;
  response.send({
    code: 200,
    msg: "获取成功",
    data: JSON.stringify(data),
  });
});

app.post("/commit/setCommitData", function (request, response) {
  const { data } = request.body;
  const {
    commitArr,
    allCommitCount,
    commitEdAmount,
    commitData,
  } = handleCommitData(data);

  handleCommit({
    commitArr,
    commitData,
    allCommitCount,
    commitEdAmount,
    data,
  }).then(() => {
    response.send({
      code: 200,
      msg: "提交成功",
    });
  });
});

app.post("/commit/getPushData", function (_, response) {
  const data = readFile("./commit/push.json");
  fileData.pushEd = data;
  response.send({
    code: 200,
    msg: "获取成功",
    data: JSON.stringify(data),
  });
});

app.post("/commit/setPushData", function (request, response) {
  const { data } = request.body;
  handPushData(data)
    .then(() => {
      response.send({
        code: 200,
        msg: "推送成功",
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

getProjectBeforeCommitInfo()
  .then(() => {
    app.listen(1202);
    const args = process.argv[2];
    console.log("服务器已开启，端口: 1202".help);
    if (args === "gitee") {
      open("http://qianduanxinlv.gitee.io/commit-ui/");
    } else {
      open(path.join(__dirname, "../../commit-ui/build/index.html"));
    }
  })
  .catch(() => {
    console.log("该项目未进行 git 版本管理，服务器暂停启动！".warn);
  });
