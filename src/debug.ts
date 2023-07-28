import { TokenStream, Parser } from "parser";
import { pageState } from "state";
import { getFragment, recursiveDecompose } from "shaders";

window.logLatex = () => {
    console.log(pageState.settings.equation);
}

window.logTokens = () => {
    let tokenStream = new TokenStream(pageState.settings.equation);
    let tokens = [];
    while (tokenStream.hasNext()) {
        let next = tokenStream.next();
        tokens.push(next);
    }
    console.log(tokens);
}

window.logAST = () => {
    console.log(Parser.current.ast);
}

window.logGLSL = () => {
    console.log(recursiveDecompose(Parser.current.ast));
}

window.logShader = () => {
    console.log(getFragment());
}