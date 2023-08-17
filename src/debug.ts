import { TokenStream } from "parser";
import { expressionState, pageState } from "state";
import { getFragment, recursiveDecompose } from "shaders";

window.logLatex = () => {
    console.log(pageState.equation);
}

window.logTokens = () => {
    let tokenStream = new TokenStream(pageState.equation);
    let tokens = [];
    while (tokenStream.hasNext()) {
        let next = tokenStream.next();
        tokens.push(next);
    }
    console.log(tokens);
}

window.logAST = () => {
    if (expressionState.type === "success") {
        console.log(expressionState.ast);
    } else {
        console.log("Expression is currently an error");
    }
}

window.logGLSL = () => {
    if (expressionState.type === "success") {
        console.log(recursiveDecompose(expressionState.ast!));
    } else {
        console.log("Expression is currently an error");
    }
}

window.logShader = () => {
    if (expressionState.type === "success") {
        console.log(getFragment());
    } else {
        console.log("Expression is currently an error");
    }
}