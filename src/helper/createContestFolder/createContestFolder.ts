import { Selection, TextEditor, window, workspace,ProgressLocation } from "vscode";
import {
  getTemplateFile,
  getTemplateLineNo,
  getUserHandle,
} from "../data/data";
import FileHandler from "../fileHandler/fileHandler";
import axios from "../axios/axios";
import Problems from "../../Component/Contests/Problems/problems";
import { text } from "stream/consumers";
import { innerText } from "domutils";

const cheerio = require("cheerio");
const { join } = require("path");

// #You need Puppeteer to create pdf. After installing Puppeteer (npm i puppeteer --save)
//uncomment required and these line to create pdf.)
// const puppeteer = require("puppeteer");
let puppeteer: any = null;

let contestCode = 0;
let pdfTrue = false;

let dir: string = "";

const assetsDir = join(__filename, "..", "..", "..", "..", "res", "template");

export function createContestFolders(
  contestId: number,
  name: string,
  pdf: boolean = false
) {
  const rootPath = workspace.workspaceFolders
    ? workspace.workspaceFolders[0]
    : null;

  if (!rootPath) {
    return;
  }

  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `${contestId} Folder`,
    },
    async (progress, token): Promise<any> => {
      dir = join(rootPath.uri.fsPath, "Codeforces", name);

      console.log("Dir: " + dir);

      contestCode = contestId;
      pdfTrue = pdf;

      progress.report({ increment: 20, message: "Fetching folder..." });

      createReqFiles();

      progress.report({ increment: 20, message: "Fetching problems..." });

      const problemsId = await getQuestions();

      progress.report({ increment: 60, message: "Opening Sol files..." });

      await openProblemsFiles(problemsId);

      return;
    }
  );
  
}

function createReqFiles() {
  // await FileHandler.createDir(join(__dirname, "..", "Codeforces"));
  FileHandler.createDir(dir);
}

async function getQuestions() {
  console.log("Fetching the data...");

  const problemsId: any = await getProblemsID();

  console.log(problemsId);

  let getTestCasesPromises: Promise<any>[] = [];

  problemsId.forEach((problem: any) => {
    getTestCasesPromises.push(getProblemTestCase(problem));
  });

  if (puppeteer && pdfTrue) {
    getProblemStatement(problemsId);
  }

  await Promise.all(getTestCasesPromises);

  return problemsId;
}

function getProblemsID() {
  const problems = new Problems(getUserHandle(), contestCode);
  return problems.fetchProblems().then(() => {
    return problems.problemsArr.map((problem) => {
      return { id: problem.id, name: problem.name };
    });
  });
}

function getProblemTestCase(problem: any) {
  return axios
    .get("/contest/" + contestCode + "/problem/" + problem.id)
    .then(async (res: any) => {
      const $ = cheerio.load(res.data);

      let testCases: any[] = [];

      $(".sample-tests .input pre").each(function (i: number, elem: any) {
        var input = $(elem).html().replace(/<\/(?:.|\n)*?>/gm, '\n').trim();
        input = input.replace(/<(?:.|\n)*?>/gm, '').trim();
        testCases[i] = { input: input};
      });

      $(".sample-tests .output pre").each(function (i: number, elem: any) {
        testCases[i] = {
          ...testCases[i],
          output: $(elem).text().trim() + "\n",
        };
      });

      storeTestCases(problem, testCases);
    })
    .catch((err: any) => handleError("Failed to get testcases"));
}

async function storeTestCases(problem: any, testCases: any) {
  const problemLabel = `${problem.id}_${problem.name}`;
  const problemDir = join(dir, problemLabel);

  let templateFile = getTemplateFile();

  if (!templateFile || !FileHandler.checkExist(templateFile)) {
    templateFile = join(assetsDir, "template.cpp");
  }

  FileHandler.createDir(problemDir);
  FileHandler.createDir(join(problemDir, "input"));
  FileHandler.createDir(join(problemDir, "output"));
  FileHandler.createDir(join(problemDir, "codeOutput"));

  if (!FileHandler.checkExist(join(problemDir, problemLabel + ".cpp"))) {
    FileHandler.copyFile(templateFile, join(problemDir, problemLabel + ".cpp"));
  }

  testCases.forEach((testCase: any, i: number) => {
    FileHandler.createFile(
      join(problemDir, "input", "input" + i + ".txt"),
      testCase.input
    );
    FileHandler.createFile(
      join(problemDir, "output", "output" + i + ".txt"),
      testCase.output
    );
  });

  console.log("Saved " + "TestCases " + problemLabel);
}

async function openProblemsFiles(problemsId: any) {
  for (const { id, name } of problemsId) {
    await openProblemSolFile(id, name);
  }
}

function openProblemSolFile(id: any, name: any) {
  const problemSolFile = join(dir, `${id}_${name}`, `${id}_${name}.cpp`);
  const row = getTemplateLineNo() ? getTemplateLineNo() : 0;

  return FileHandler.openFile(problemSolFile, { preview: false }).then(
    (editor: TextEditor) => {
      const lineCount = editor.document.lineCount;
      const cursorAtLine = lineCount >= row ? row - 1 : lineCount - 1;
      const range = editor.document.lineAt(cursorAtLine).range;
      editor.selection = new Selection(range.end, range.end);
      editor.revealRange(range);
      return;
    }
  );
}

function getProblemStatement(problemsId: any) {
  problemsId.forEach((problem: any) => {
    const id = problem.id;
    printPDF(
      "https://codeforces.com" + "/contest/" + contestCode + "/problem/" + id,
      dir + "/" + id + "/" + id + ".pdf",
      id
    );
  });
}

async function printPDF(url: string, path: string, id: string) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });
    await page.pdf({ path: path });

    await browser.close();

    console.log("Downloaded " + "Problem " + id);
  } catch (err: any) {
    handleError(err);
  }
}

function handleError(error: string) {
  console.log("Got an Error. Please try again!!!");
  console.error(error);
  process.exit();
}
