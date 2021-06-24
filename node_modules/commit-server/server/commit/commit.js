const fs = require("fs");
const path = require("path");
const async = require("async");
const { exec } = require("child_process");
let isNpmPackage = null;

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

const checkGit = () => {
  const currentPath = fs.readdirSync(path.join(__dirname, "../../../../"));
  isNpmPackage =
    currentPath.includes("node_modules") &&
    currentPath.includes("package.json");
  if (!currentPath.includes(".git") && isNpmPackage) {
    console.log(
      "当前项目未检测到 .git 文件夹，请执行git init 及 git push 等一系列完整推送操作后再启动项目服务器。 ---别忘记 .gitignore 文件哦！"
    );
    return false;
  }
  return true;
};

const saveBeforeCommitData = (stdout) => {
  let commitInfoArr;
  if (stdout) {
    commitInfoArr = stdout.split("\n");
  } else {
    commitInfoArr = [];
  }
  const commitInfoObj = { commitInfoArr };

  const pushData = readFile("./push.json");
  for (let i = 0; i < commitInfoArr.length; i++) {
    pushData[commitInfoArr[i]] = (pushData[commitInfoArr[i]] || 0) + 1;
  }

  writeFile("./before.json", commitInfoObj);
  writeFile("./push.json", pushData);
};

const handleCommit = ({
  commitArr,
  commitData,
  allCommitCount,
  commitEdAmount,
  data,
}) => {
  let outForAmount = 0,
    inForAmount = 0;
  return new Promise((resolve) => {
    async.forever(
      function (callback) {
        allCommitCount--;
        commitEdAmount++;
        if (commitData[commitArr[outForAmount]] <= inForAmount) {
          inForAmount = 0;
          outForAmount++;
        }

        if (outForAmount >= commitArr.length) {
          writeFile("./commit.json", JSON.parse(data));
          resolve();
          if (commitArr.length > 0) {
            console.log("提交成功");
            writeFile("./save.json", {});
            console.log("save.json 文件已清空");
          } else {
            writeFile("./commit.json", {});
            console.log("commit.json 文件已清空");
          }
          callback("done");
          return;
        }

        try {
          fs.writeFileSync(
            path.join(
              __dirname,
              isNpmPackage ? "../../../../random.txt" : "./random.txt"
            ),
            Math.random() + "(当前文件仅用于每次修改后 git add 使用)"
          );
          const cmd = `git add -A && git commit -m 提交有趣的代码-点赞有趣的项目-关注有趣的作者-我一共提交了${commitEdAmount}次-每次提交我都超开心 --date='${
            commitArr[outForAmount]
          }T${parseInt(Math.random() * 5 + 18, 10)}:${parseInt(
            Math.random() * 49 + 10,
            10
          )}:${parseInt(Math.random() * 49 + 10, 10)}+0800'`;
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
              console.log(
                `提交日期: ${commitArr[outForAmount]}---已提交${
                  inForAmount + 1
                }次---预计还剩${allCommitCount}次`
              );
              inForAmount++;
              callback();
            }
          );
        } catch (err) {
          console.log(err);
        }
      },
      function (err) {
        console.log(err);
      }
    );
  });
};

const getProjectBeforeCommitInfo = () => {
  return new Promise((resolve, reject) => {
    const isHaveGit = checkGit();
    if (!isHaveGit) {
      reject();
      return;
    }

    const beforeData = readFile("./before.json");

    if (beforeData.commitInfoArr) {
      resolve();
      return;
    }

    exec(
      "git log --date=format:%Y-%m-%d --pretty=format:%ad",
      {
        encoding: "utf8",
        cwd: null,
        env: undefined,
      },
      (error, stdout, stderr) => {
        if (error || stderr) {
          console.log("该项目暂无commit信息");
        }
        saveBeforeCommitData(stdout);
        resolve();
      }
    );
  });
};

module.exports = {
  handleCommit,
  getProjectBeforeCommitInfo,
};
