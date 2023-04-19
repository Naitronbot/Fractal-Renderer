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

class ParseNode {
    
}

class NumberNode extends ParseNode {
    value: string;
    constructor(value: string) {
        super();
        this.value = value;
    }
}

class VariableNode extends ParseNode {
    value: string;
    constructor(value: string) {
        super();
        this.value = value;
    }
}

class TwoOperatorNode extends ParseNode {
    left: ParseNode;
    operator: string;
    right: ParseNode;
    constructor(left: ParseNode, operator: string, right: ParseNode) {
        super();
        this.left = left;
        this.operator = operator;
        this.right = right;
    } 
}

class OneOperatorNode extends ParseNode {
    operator: string;
    value: ParseNode;
    constructor(operator: string, value: ParseNode) {
        super();
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

function recursive_parse(stream: TokenStream, precedence: number): ParseNode {
    let left = stream.next();
    
    // Check for end of input
    if (left === null) {
        throw new ParseError("Parsing Error", "Unexpected end of input");
    }

    // Get the type of the left node
    let leftNode: ParseNode;
    if (left.type === "number") {
        leftNode = new NumberNode(left.value);
    } else if (left.type === "variable") {
        leftNode = new VariableNode(left.value);
    } else if (left.type === "openingGroup") {
        let inner = recursive_parse(stream, 0);
        if (inner === null) {
            throw new ParseError("Parsing Error", `Opening bracket ${left.value.slice(-1)} needs to be closed`);
        }

        let closing = stream.next();
        if (closing === null) {
            throw new ParseError("Parsing Error", `Opening bracket ${left.value.slice(-1)} needs to be closed`);
        }
        if (closing.value !== BRACKETS[left.value]) {
            throw new ParseError("Parsing Error", `Mismatched bracket ${left.value.slice(-1)} and ${closing.value.slice(-1)}`);
        }
        leftNode = inner;
    } else if (left.type === "closingGroup") {
        throw new ParseError("Parsing Error", "Brackets cannot be empty" );
    } else if (left.type === "openingLatexGroup") {
        let inner = recursive_parse(stream, 0);
        if (inner === null) {
            throw new ParseError("Parsing Error", `Superscripts cannot be empty`);
        }

        let closing = stream.next();
        if (closing === null) {
            throw new ParseError("Parsing Error", `Malformed Latex`);
        }
        if (closing.type !== "closingLatexGroup") {
            throw new ParseError("Parsing Error", `Malformed Latex`);
        }
        leftNode = inner;
    } else if (left.type === "closingLatexGroup") {
        throw new ParseError("Parsing Error", "Superscripts cannot be empty");
    } else if (left.value === "\\frac" && left.type === "special") {
        let numerator = parseLatexGroup(stream);
        let denominator = parseLatexGroup(stream);
        leftNode = new TwoOperatorNode(numerator, "/", denominator);
    } else if (left.type === "special") {
        let inner = recursive_parse(stream, 15);
        if (inner === null) {
            throw new ParseError("Parsing Error", "Unexpected end of input");
        }
        leftNode = new OneOperatorNode(left.value, inner);
    } else {
        throw new ParseError("Parsing Error", "Unknown token: " + left.value);
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
            let rightNode: ParseNode = recursive_parse(stream, getPrecedence(next.value));

            leftNode = new TwoOperatorNode(leftNode, next.value, rightNode);
        } else {
            if (getPrecedence("*") <= precedence) {
                return leftNode;
            }
            let rightNode: ParseNode = recursive_parse(stream, getPrecedence("*"));

            leftNode = new TwoOperatorNode(leftNode, "*", rightNode);
        }
    }
}

function parseGroup() {

}

function parseLatexGroup(stream: TokenStream) {
    let opening = stream.next();
    if (opening === null) {
        throw new ParseError("Parsing Error", "Unexpected end of input");
    }
    if (opening.value !== "{") {
        throw new ParseError("Parsing Error", "Malformed Latex");
    }

    let value = recursive_parse(stream, 0);
    if (value === null) {
        throw new ParseError("Parsing Error", `Unexpected end of input`);
    }

    let closing = stream.next();
    if (closing === null) {
        throw new ParseError("Parsing Error", `Unexpected end of input`);
    }
    if (closing.value !== "}") {
        throw new ParseError("Parsing Error", `Malformed Latex`);
    }

    return value;
}

function getPrecedence(op: string): number {
    return PRECEDENCE[op];
}