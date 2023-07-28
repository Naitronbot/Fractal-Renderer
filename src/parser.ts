import { sidebarVars } from "sliders";
import { pageState } from "state";
import { UIElements } from "ui";

// Tokenizer regex, links regular expressions to their corresponding token names
const TOKENS: [RegExp,string][] = [
    [/^(\d+\.?\d*|\d*\.?\d+|\\pi)/, "number"],
    [/^([a-zA-Z])/, "letter"],
    [/^([\+\-\^]|^\\cdot)/, "operator"],
    [/^(\_)/, "subscript"],
    [/^\\left(\(|\[|\\\{)/, "openingGroup"],
    [/^\\right(\)|\]|\\\})/, "closingGroup"],
    [/^\\left(\|)/, "openingAbs"],
    [/^\\right(\|)/, "closingAbs"],
    [/^({)/, "openingLatexGroup"],
    [/^(})/, "closingLatexGroup"],
    [/^\\operatorname\{([a-zA-Z]+)\}/, "special"],
    [/^\\([a-zA-Z]+)/, "special"]
];

// Gives how tightly binding operators should be
const PRECEDENCE: {[op: string]: number} = {
    "+": 10,
    "-": 10,
    "*": 20,
    "^": 30
};

// Gives closing bracket token for each opening bracket
const BRACKETS: {[open: string]: string} = {
    "(": ")",
    "[": "]",
    "\\{": "\\}",
    "|": "|"
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

// Input TokenStream, procedurally tokenizes input string as needed
export class TokenStream {
    input: string;
    current: Token | null;

    constructor(input: string) {
        this.input = input;
        this.current = null;
    }

    // Advances pointer and returns next token
    next() {
        let next = this.current;
        this.current = null;
        return next || this.read();
    }

    // Returns next token without advancing pointer
    peek() {
        return this.current || (this.current = this.read());
    }

    // Retuns whether or not there is another token
    hasNext() {
        return this.peek() != null;
    }
    
    // Read and return a single token
    private read(): Token | null {
        this.input = this.input.replace(/^(?:\\? )+/, "");

        if (this.input.charAt(0) === "") {
            return null;
        }

        for (let key of TOKENS) {
            let matchIndex = key[0].exec(this.input);
            if (matchIndex !== null) {
                this.input = this.input.substring(matchIndex[0].length);
                if (matchIndex[1] === "\\cdot") {
                    return new Token(key[1], "*");
                }
                return new Token(key[1], matchIndex[1]);
            }
        }

        throw new ParseError("Tokenizing Error", "Unknown symbol " + this.input.charAt(0));
    }
}

export type ParseNode = NumberNode | VariableNode | TwoOperatorNode | OneOperatorNode;

export class NumberNode {
    value: string;
    constructor(value: string) {
        this.value = value;
    }
}

export class VariableNode {
    value: string;
    userDefined: boolean;
    constructor(value: string, user: boolean) {
        this.value = value;
        this.userDefined = user;
    }
}

export class TwoOperatorNode {
    left: ParseNode;
    operator: string;
    right: ParseNode;
    constructor(left: ParseNode, operator: string, right: ParseNode) {
        this.left = left;
        this.operator = operator;
        this.right = right;
    } 
}

export class OneOperatorNode {
    operator: string;
    value: ParseNode;
    constructor(operator: string, value: ParseNode) {
        this.operator = operator;
        this.value = value;
    } 
}

// Parses the current expression, and stores info related to it
export class Parser {
    static current: Parser;

    private equation: string; // Equation to parse, use settings.equation for external equation
    ast: ParseNode; // Parsed AST of current equation
    userVars: Set<string>; // Set of user defined variables
    success: boolean; // If the parser encountered no syntax errors
    needsVars: boolean; // If there are variables in the current equation that the user has not defined
    
    constructor(equation: string) {
        pageState.settings.equation = equation;
        this.equation = equation;
        this.userVars = new Set();
        this.ast = new NumberNode("0");
        this.success = false;
        this.needsVars = false;
    }

    parse() {
        // Handle case when input is empty
        if (this.equation === "") {
            UIElements.errorBox.hide();
            return true;
        }

        let stream = new TokenStream(this.equation);
        try {
            let ast = this.recursiveParse(stream, 0);

            if (ast instanceof ParseError) {
                throw ast;
            }

            this.ast = ast;
            UIElements.errorBox.hide();
            this.success = true;
            this.manageVariables();
            Parser.current = this;
            return true;
        } catch(error) {
            if(!(error instanceof ParseError)) { throw error; }
            
            UIElements.errorBox.show(error.name, error.message);
            this.manageVariables();
            Parser.current = this;
            return false;
        }
    }

    // Handles displaying of variable errors, variable button UI, and determines if there are undefined variables
    manageVariables() {
        if (!this.success) {
            UIElements.sliderButton.classList.add("disabled");
            return;
        }
        for (let val of this.userVars) {
            if (!sidebarVars.has(val)) {
                UIElements.errorBox.show("Variable Error", `${val} is not defined`);
                UIElements.sliderButton.classList.remove("disabled");
                this.needsVars = true;
                return;
            }
        }
        UIElements.sliderButton.classList.add("disabled");
        this.needsVars = false;
    }

    recursiveParse(stream: TokenStream, precedence: number): ParseNode | ParseError {
        let left = stream.next();
        
        // Check for end of input
        if (left === null) {
            throw new ParseError("Parsing Error", "Unexpected end of input");
        }
    
        // Get the type of the left node
        let leftNode: ParseNode | ParseError;
        if (left.type === "number") {
            leftNode = new NumberNode(left.value);
        } else if (left.type === "letter") {
            let next = stream.peek();
            if (next !== null && next.type === "subscript") {
                stream.next();
                let subOpening = stream.next(); 
                if (subOpening === null || subOpening.type !== "openingLatexGroup") {
                    throw new ParseError("Parsing Error", "Malformed Latex");
                }
                let subscript = "";
                let subNext;
                while (true) {
                    subNext = stream.next()
                    if (subNext === null) {
                        throw new ParseError("Parsing Error", "Malformed Latex");
                    }
                    if (subNext.type === "closingLatexGroup") {
                        break;
                    }
                    if (subNext.type !== "letter" && subNext.type !== "number") {
                        throw new ParseError("Parsing Error", "Unexpected value in variable subscript");
                    }
                    subscript += subNext.value;
                }
                if (subscript === "") {
                    throw new ParseError("Parsing Error", "Subscripts cannot be empty");
                }
                if (subscript.includes("\\")) {
                    throw new ParseError("Parsing Error", "Invalid character in variable subscript");
                }
                leftNode = new VariableNode(left.value + "_" + subscript, true);
                this.userVars.add(leftNode.value);
            } else if (/^[ei]$/.test(left.value)) {
                leftNode = new NumberNode(left.value);
            } else if (/^[zc]$/.test(left.value)) {
                leftNode = new VariableNode(left.value, false);
            } else {
                leftNode = new VariableNode(left.value, true);
                this.userVars.add(leftNode.value);
            }
        } else if (left.value === "-") {
            let next = this.recursiveParse(stream, 15);
            if (next instanceof ParseError) {
                throw next;
            }
            leftNode = new TwoOperatorNode(new NumberNode("0"), "-", next);
        } else if (left.type === "openingGroup") {
            leftNode = this.parseGroup(stream, left);
        } else if (left.type === "closingGroup") {
            throw new ParseError("Parsing Error", "Brackets cannot be empty" );
        } else if (left.type === "openingLatexGroup") {
            leftNode = this.parseLatexGroup(stream, false);
        } else if (left.type === "closingLatexGroup") {
            return new ParseError("Parsing Error", "Latex groups cannot be empty");
        } else if (left.type === "openingAbs") {
            let inner = this.parseGroup(stream, left);
            if (inner instanceof ParseError) {
                throw inner;
            }
            leftNode = new OneOperatorNode("abs", inner);
        } else if (left.type === "closingAbs") {
            return new ParseError("Parsing Error", "Absolute values cannot be empty");
        } else if (left.value === "frac" && left.type === "special") {
            let numerator = this.parseLatexGroup(stream, true);
            if (numerator instanceof ParseError) {
                throw new ParseError("Parsing Error", "Numerator of a fraction cannot be empty");
            }
            let denominator = this.parseLatexGroup(stream, true);
            if (denominator instanceof ParseError) {
                throw new ParseError("Parsing Error", "Denominator of a fraction cannot be empty");
            }
            leftNode = new TwoOperatorNode(numerator, "/", denominator);
        } else if (left.value === "log" && left.type === "special") {
            let next = stream.peek();
            let base: ParseNode = new NumberNode("10");
            if (next === null) {
                throw new ParseError("Parsing Error", `Function \'log\' must have an argument`);
            }
            if (next.type === "subscript") {
                stream.next();
                let subscript = this.parseLatexGroup(stream, true);
                if (subscript instanceof ParseError) {
                    throw new ParseError("Parsing Error", "Subscripts cannot be empty");
                }
                base = subscript;
            }
    
            let inner = this.parseFunction(stream, left);
            if (inner instanceof ParseError) {
                throw inner;
            }
            
            leftNode = new TwoOperatorNode(inner, "log", base);
        } else if (left.type === "special") {
            let inner = this.parseFunction(stream, left);
            if (inner instanceof ParseError) {
                throw inner;
            }
            leftNode = new OneOperatorNode(left.value, inner);
        } else if (left.type === "operator") {
            throw new ParseError("Parsing Error", `Unexpected operator: ${left.value}`);
        } else if (left.type === "subscript") {
            throw new ParseError("Parsing Error", `Unexpected subscript`);
        } else {
            throw new ParseError("Parsing Error", "Unknown token " + left.value);
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
            if (next.type === "closingGroup" || next.type === "closingLatexGroup" || next.type === "closingAbs") {
                return leftNode;
            }
    
            if (next.type === "operator") {
                if (PRECEDENCE[next.value] <= precedence) {
                    return leftNode;
                }
                stream.next();
                let rightNode = this.recursiveParse(stream, PRECEDENCE[next.value]);
                if (rightNode instanceof ParseError) {
                    throw new ParseError("Parsing Error", "Exponents cannot be empty");
                }
    
                leftNode = new TwoOperatorNode(leftNode, next.value, rightNode);
            } else {
                if (PRECEDENCE["*"] <= precedence) {
                    return leftNode;
                }
                let rightNode = this.recursiveParse(stream, PRECEDENCE["*"]);
                if (rightNode instanceof ParseError) {
                    throw rightNode;
                }
    
                leftNode = new TwoOperatorNode(leftNode, "*", rightNode);
            }
        }
    }

    // Parse a math group (parenthesis, brackets, or curly brackets)
    parseGroup(stream: TokenStream, opening: Token | null): ParseNode | ParseError {
        if (opening === null) {
            opening = stream.next();
            if (opening === null) {
                throw new ParseError("Parsing Error", "Unexpected end of input");
            }
            if (opening.type != "openingGroup" && opening.type != "openingAbs") {
                throw new ParseError("Parsing Error", "Malformed Latex");
            }
        }
    
        let inner = this.recursiveParse(stream, 0);
        if (inner === null) {
            throw new ParseError("Parsing Error", `Opening bracket ${opening.value} needs to be closed`);
        }
        if (inner instanceof ParseError) {
            return inner;
        }
    
        let closing = stream.next();
        if (closing === null) {
            throw new ParseError("Parsing Error", `Opening bracket ${opening.value} needs to be closed`);
        }
        if (closing.value !== BRACKETS[opening.value]) {
            throw new ParseError("Parsing Error", `Mismatched bracket ${opening.value} and ${closing.value}`);
        }
        return inner;
    }

    // Parse a latex group (un-escaped curly brackets)
    parseLatexGroup(stream: TokenStream, checkOpening: boolean): ParseNode | ParseError {
        if (checkOpening) {
            let opening = stream.next();
            if (opening === null) {
                throw new ParseError("Parsing Error", "Unexpected end of input");
            }
            if (opening.value !== "{") {
                throw new ParseError("Parsing Error", "Malformed Latex");
            }
        }
    
        let inner = this.recursiveParse(stream, 0);
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

    // Parse a function: \name()
    parseFunction(stream: TokenStream, left: Token): ParseNode | ParseError {
        if (left.value === "backslash") {
            throw new ParseError("Parsing Error", "Unexpected backslash");
        }
        let next = stream.peek();
        if (next === null) {
            throw new ParseError("Parsing Error", `Function \'${left.value}\' must have an argument`);
        }
        let inner: ParseNode | ParseError;
        if (next.type === "openingGroup") {
            inner = this.parseGroup(stream, null);
            if (inner instanceof ParseError) {
                throw inner;
            }
        } else if (next.type === "openingLatexGroup") {
            inner = this.parseLatexGroup(stream, true);
            if (inner instanceof ParseError) {
                throw new ParseError("Parsing Error", `Square roots cannot be empty`);
            }
        } else {
            inner = this.recursiveParse(stream, 15);
            if (inner === null) {
                throw new ParseError("Parsing Error", `Function \'${left.value}\' must have an argument`);
            }
            if (inner instanceof ParseError) {
                throw inner;
            }
        }
        return inner;
    }
}