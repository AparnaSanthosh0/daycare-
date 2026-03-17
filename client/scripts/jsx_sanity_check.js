const fs = require("fs");
const path = require("path");

const target = process.argv[2] || "src/pages/Driver/DriverDashboard.jsx";
const fullPath = path.resolve(process.cwd(), target);
const code = fs.readFileSync(fullPath, "utf8");

function lexUnclosedBrackets(input) {
  // Counts () {} [] outside strings/comments/templates.
  // Not a full JS lexer, but good at spotting unmatched opens.
  let state = "code";
  let quoteStart = null;
  const stack = [];
  const push = (ch, i) => stack.push({ ch, i });
  const pop = (expected) => {
    const top = stack[stack.length - 1];
    if (!top || top.ch !== expected) return false;
    stack.pop();
    return true;
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const n = input[i + 1];

    if (state === "code") {
      if (c === '"') {
        state = "dquote";
        quoteStart = { kind: '"', i };
        continue;
      }
      if (c === "'") {
        state = "squote";
        quoteStart = { kind: "'", i };
        continue;
      }
      if (c === "`") {
        state = "template";
        continue;
      }
      if (c === "/" && n === "/") {
        state = "linecomment";
        i++;
        continue;
      }
      if (c === "/" && n === "*") {
        state = "blockcomment";
        i++;
        continue;
      }

      if (c === "{" || c === "(" || c === "[") push(c, i);
      else if (c === "}") {
        if (!pop("{")) return { kind: "extra_close", ch: "}", i };
      } else if (c === ")") {
        if (!pop("(")) return { kind: "extra_close", ch: ")", i };
      } else if (c === "]") {
        if (!pop("[")) return { kind: "extra_close", ch: "]", i };
      }
    } else if (state === "linecomment") {
      if (c === "\n") state = "code";
    } else if (state === "blockcomment") {
      if (c === "*" && n === "/") {
        state = "code";
        i++;
      }
    } else if (state === "squote") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "'") {
        state = "code";
        quoteStart = null;
      }
    } else if (state === "dquote") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') {
        state = "code";
        quoteStart = null;
      }
    } else if (state === "template") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "`") {
        state = "code";
        continue;
      }
      if (c === "$" && n === "{") {
        // track the ${ ... } open
        push("{", i + 1);
        i++;
        state = "template_expr";
        continue;
      }
    } else if (state === "template_expr") {
      if (c === '"') {
        state = "template_expr_dquote";
        continue;
      }
      if (c === "'") {
        state = "template_expr_squote";
        continue;
      }
      if (c === "`") {
        state = "template_expr_template";
        continue;
      }
      if (c === "/" && n === "/") {
        state = "template_expr_linecomment";
        i++;
        continue;
      }
      if (c === "/" && n === "*") {
        state = "template_expr_blockcomment";
        i++;
        continue;
      }

      if (c === "{" || c === "(" || c === "[") push(c, i);
      else if (c === "}") {
        const top = stack.pop();
        if (!top) return { kind: "extra_close", ch: "}", i };
        // If we closed the ${ ... } open, return to template.
        if (top.ch === "{" && input[top.i - 1] === "$") state = "template";
      } else if (c === ")") {
        if (!pop("(")) return { kind: "extra_close", ch: ")", i };
      } else if (c === "]") {
        if (!pop("[")) return { kind: "extra_close", ch: "]", i };
      }
    } else if (state === "template_expr_linecomment") {
      if (c === "\n") state = "template_expr";
    } else if (state === "template_expr_blockcomment") {
      if (c === "*" && n === "/") {
        state = "template_expr";
        i++;
      }
    } else if (state === "template_expr_squote") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "'") state = "template_expr";
    } else if (state === "template_expr_dquote") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') state = "template_expr";
    } else if (state === "template_expr_template") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "`") state = "template_expr";
    }
  }

  if (stack.length) {
    return { kind: "unclosed_open", open: stack[stack.length - 1], stackSize: stack.length, state, quoteStart };
  }
  if (state === "squote" || state === "dquote") {
    return { kind: "unclosed_quote", state, quoteStart };
  }
  return null;
}

const lexIssue = lexUnclosedBrackets(code);
if (lexIssue) {
  console.log("LEX ISSUE:", lexIssue);
  const idx = lexIssue.i ?? lexIssue.open?.i ?? 0;
  const start = Math.max(0, idx - 200);
  const end = Math.min(code.length, idx + 200);
  console.log(code.slice(start, end));
} else {
  console.log("LEX OK: brackets balanced outside strings/comments.");
}

try {
  // react-scripts uses @babel/parser under the hood
  const parser = require("@babel/parser");
  parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  console.log("BABEL PARSE OK");
} catch (e) {
  console.log("BABEL PARSE ERROR:", e.message);
  if (e.loc) console.log("LOC:", e.loc);
}

