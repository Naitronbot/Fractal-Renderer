const TOKEN_REGEX = [
    /^\d+|^\\pi|^e|^i/,
    /^[zc]/,
    /^[\+\-\^]|^\\cdot/,
    /^\\left(?:\(|\[|\\\{)/,
    /^\\right(?:\)|\]|\\\})/,
    /^\\left\|/,
    /^\\right\|/,
    /^{/,
    /^}/,
    /^\\[a-zA-Z]+/
];
const TOKEN_NAMES = [
    "number",
    "variable",
    "operator",
    "openingGroup",
    "closingGroup",
    "openingAbs",
    "closingAbs",
    "openingLatexGroup",
    "closingLatexGroup",
    "special"
];
const PRECEDENCE: {[op: string]: number} = {
    "+": 10,
    "-": 10,
    "*": 20,
    "^": 30
};
const BRACKETS: {[open: string]: string} = {
    "\\left(": "\\right)",
    "\\left[": "\\right]",
    "\\left\\{": "\\right\\}"
};

class ParseError implements Error {
    name: string;
    message: string;

    constructor(name: string, message: string) {
        this.name = name;
        this.message = message;
    }

}

class Token {
    type: string;
    value: string;
    constructor(type: string, value: string) {
        this.type = type;
        this.value = value;
    }
}

class TokenStream {
    input: string;
    current: Token | null;

    constructor(input: string) {
        this.input = input;
        this.current = null;
    }

    next() {
        let next = this.current;
        this.current = null;
        return next || this.read();
    }

    peek() {
        return this.current || (this.current = this.read());
    }

    hasNext() {
        return this.peek() != null;
    }
    
    private read(): Token | null {
        this.input = this.input.replace(/^(?:\\? )+/, "");

        if (this.input.charAt(0) === "") {
            return null;
        }

        for (let i in TOKEN_REGEX) {
            let matchIndex = this.input.match(TOKEN_REGEX[i]);
            if (matchIndex !== null) {
                this.input = this.input.substring(matchIndex[0].length);
                if (matchIndex[0] === "\\cdot") {
                    return new Token(TOKEN_NAMES[i], "*");
                }
                return new Token(TOKEN_NAMES[i], matchIndex[0]);
            }
        }

        throw new ParseError("Tokenizing Error", "Unknown symbol: " + this.input.charAt(0));
    }
}

type ParseNode = NumberNode | VariableNode | TwoOperatorNode | OneOperatorNode;

class NumberNode {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
}

class VariableNode {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
}

class TwoOperatorNode {
    left: ParseNode;
    operator: string;
    right: ParseNode;
    constructor(left: ParseNode, operator: string, right: ParseNode) {
        this.left = left;
        this.operator = operator;
        this.right = right;
    } 
}

class OneOperatorNode {
    operator: string;
    value: ParseNode;
    constructor(operator: string, value: ParseNode) {
        this.operator = operator;
        this.value = value;
    } 
}

function parse() {
    let stream = new TokenStream(MQ_FIELD.latex());
    try {
        let ast = recursive_parse(stream, 0);
        console.log(ast);
    } catch(error) {
        if(!(error instanceof ParseError)) { throw error; }
        console.log(error.name + ": " + error.message);
    }
}

function recursive_parse(stream: TokenStream, precedence: number): ParseNode | ParseError {
    let left = stream.next();
    
    // Check for end of input
    if (left === null) {
        throw new ParseError("Parsing Error", "Unexpected end of input");
    }

    // Get the type of the left node
    let leftNode: ParseNode | ParseError;
    if (left.type === "number") {
        leftNode = new NumberNode(left.value);
    } else if (left.type === "variable") {
        leftNode = new VariableNode(left.value);
    } else if (left.type === "openingGroup") {
        leftNode = parseGroup(stream, left);
    } else if (left.type === "closingGroup") {
        throw new ParseError("Parsing Error", "Brackets cannot be empty" );
    } else if (left.type === "openingLatexGroup") {
        leftNode = parseLatexGroup(stream, false);
    } else if (left.type === "closingLatexGroup") {
        return new ParseError("Parsing Error", "Latex groups cannot be empty");
    } else if (left.value === "\\frac" && left.type === "special") {
        let numerator = parseLatexGroup(stream, true);
        if (numerator instanceof ParseError) {
            throw new ParseError("Parsing Error", "Numerator of a fraction cannot be empty");
        }
        let denominator = parseLatexGroup(stream, true);
        if (denominator instanceof ParseError) {
            throw new ParseError("Parsing Error", "Denominator of a fraction cannot be empty");
        }
        leftNode = new TwoOperatorNode(numerator, "/", denominator);
    } else if (left.type === "special") {
        let next = stream.peek();
        if (next === null) {
            throw new ParseError("Parsing Error", `Function ${left.value.slice(1)} must have an argument`);
        }
        let inner: ParseNode | ParseError;
        if (next.type === "openingGroup") {
            inner = parseGroup(stream, null);
            if (inner instanceof ParseError) {
                throw inner;
            }
        } else if (next.type === "openingLatexGroup") {
            inner = parseLatexGroup(stream, true);
            if (inner instanceof ParseError) {
                throw new ParseError("Parsing Error", `Square roots cannot be empty`);
            }
        } else {
            inner = recursive_parse(stream, 15);
            if (inner === null) {
                throw new ParseError("Parsing Error", `Function ${left.value.slice(1)} must have an argument`);
            }
            if (inner instanceof ParseError) {
                throw inner;
            }
        }
        leftNode = new OneOperatorNode(left.value, inner);
    } else if (left.type === "operator") {
        throw new ParseError("Parsing Error", `Unexpected operator: ${left.value}`);
    } else {
        throw new ParseError("Parsing Error", "Unknown token: " + left.value);
    }

    if (leftNode instanceof ParseError) {
        return leftNode;
    }

    while (true) {
        let next = stream.peek();

        // Check for end of input
        if (next === null) {
            return leftNode;
        }
        if (next.type === "closingGroup" || next.type === "closingLatexGroup") {
            return leftNode;
        }

        if (next.type === "operator") {
            if (getPrecedence(next.value) <= precedence) {
                return leftNode;
            }
            stream.next();
            let rightNode = recursive_parse(stream, getPrecedence(next.value));
            if (rightNode instanceof ParseError) {
                throw new ParseError("Parsing Error", "Exponents cannot be empty");
            }

            leftNode = new TwoOperatorNode(leftNode, next.value, rightNode);
        } else {
            if (getPrecedence("*") <= precedence) {
                return leftNode;
            }
            let rightNode = recursive_parse(stream, getPrecedence("*"));
            if (rightNode instanceof ParseError) {
                throw rightNode;
            }

            leftNode = new TwoOperatorNode(leftNode, "*", rightNode);
        }
    }
}

function parseGroup(stream: TokenStream, opening: Token | null): ParseNode| ParseError {
    if (opening === null) {
        opening = stream.next();
        if (opening === null) {
            throw new ParseError("Parsing Error", "Unexpected end of input");
        }
        if (opening.type != "openingGroup") {
            throw new ParseError("Parsing Error", "Malformed Latex");
        }
    }

    let inner = recursive_parse(stream, 0);
    if (inner === null) {
        throw new ParseError("Parsing Error", `Opening bracket ${opening.value.slice(-1)} needs to be closed`);
    }
    if (inner instanceof ParseError) {
        return inner;
    }

    let closing = stream.next();
    if (closing === null) {
        throw new ParseError("Parsing Error", `Opening bracket ${opening.value.slice(-1)} needs to be closed`);
    }
    if (closing.value !== BRACKETS[opening.value]) {
        throw new ParseError("Parsing Error", `Mismatched bracket ${opening.value.slice(-1)} and ${closing.value.slice(-1)}`);
    }
    return inner;
}

function parseLatexGroup(stream: TokenStream, checkOpening: boolean): ParseNode | ParseError {
    if (checkOpening) {
        let opening = stream.next();
        if (opening === null) {
            throw new ParseError("Parsing Error", "Unexpected end of input");
        }
        if (opening.value !== "{") {
            throw new ParseError("Parsing Error", "Malformed Latex");
        }
    }

    let inner = recursive_parse(stream, 0);
    if (inner === null) {
        throw new ParseError("Parsing Error", `Unexpected end of input`);
    }
    if (inner instanceof ParseError) {
        return inner;
    }

    let closing = stream.next();
    if (closing === null) {
        throw new ParseError("Parsing Error", `Unexpected end of input`);
    }
    if (closing.value !== "}") {
        throw new ParseError("Parsing Error", `Malformed Latex`);
    }

    return inner;
}

function getPrecedence(op: string): number {
    return PRECEDENCE[op];
}