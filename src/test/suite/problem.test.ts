import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

const fs = require("fs");

import axios from "../../helper/axios/axios";
import Problem from "../../Component/Contests/Problems/problem";
import Problems from "../../Component/Contests/Problems/problems";

suite('Problem Test Suite', () => {
	vscode.window.showInformationMessage('Start problem tests.');

	test('fetch problems test', () => {
		testProblems();
	});
});



async function testProblem() {

    const problem = new Problem("avi-01",1437,"E");

    await problem.fetchProblemData();
    
    console.log(problem);


    const problem1 = new Problem("whitewalker7",1436,"D");

    await problem1.fetchProblemData();
    
    console.log(problem1);
}



async function testProblems() {

    const problems = new Problems("avi-01",1437);

    await problems.fetchProblems();
    
    console.log(problems);


    const problems1 = new Problems("whitewalker7",1436);

    await problems1.fetchProblems();
    
    console.log(problems1);
}