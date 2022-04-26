// TODO
// * elem
// * cat
// * map
// * filter
// / join
// / dict
// / println, prn
// / if
// / fun

Array.prototype.toString = function () {
    return "[" + this.join(", ") + "]";
};

Array.prototype.zip = function (xs) {
    let ret = [];
    for (let i = 0; i < this.length; i += 1) {
        ret.push(this[i]);
        ret.push(xs[i]);
    }
    return ret;
};

WeakMap.prototype.toString = function () {
    return "#WeakMap";
    let ret = [];
    Object.keys(this).forEach(function (k) {
        ret.push (k + ": " + this[k]);
    });
    return ret.join(", ");
}

Function.prototype.toString = function () {
    return "#Func";
}

function main () {
    init();
    run_tests();
    //console.log("argv: " + process.argv.length);
    if (process.argv.length === 3) {
        let file = process.argv[2];
        load(file);
    }
}

function init () {
    ARROW = sym("->");
    QMARK = sym("?");
    PLUS = sym("+");
    MULT = sym("*");
    SET = sym("set!");

    "def defn fun self if do cat join map f x".split(" ").forEach(function (x) {
        global[x.toUpperCase()] = sym(x);
    });

    GENV = new Env(null, [PLUS, plus, sym("*"), mult, sym("<="), lte, sym("inc"), inc, sym("dec"), dec,
        sym("prn"), prn]);
}

function println (...args) {
    let s = args.join("");
    console.log(s);
}

function prn (...args) {
    let s = args.map(to_str).join("");
    console.log(s);
}

function to_str (x) {
    if (Array.isArray(x))
        return x.map(to_str);
    else if (typeof(x) === "string")
        return '"' + x + '"';
    else
        return x;
}

function run_tests () {
    assert(read("x"), sym("x"));
    //assert(read('"a b \"c\" d"'), "a b \"c\" d");
    assert(read('(cat "a" "b")'), [CAT, "a", "b"]);
    assert(read('(defn f (x) (cat x "x"))'), 
        [DEF, sym("f"), [FUN, [sym("x")], [CAT, sym("x"), "x"]]]);
    assert(replace_qmark([sym("join"), sym("?"), " "], sym("x")), [JOIN, X, " "]);
    assert(replace_qmark([PLUS, 1, [MULT, 2, QMARK]], X), [PLUS, 1, [MULT, 2, X]]);
    assert(read('(-> x (map f ?) (join ? " "))'), [JOIN, [MAP, F, X], " "]);
    assert(eval(read('(+ 2 3)')), 5);
    assert(eval(read('((fun () (+ 1 3)))')), 4);
    assert(read('((fun (x) (+ 1 x)) 5)'), [[FUN, [X], [PLUS, 1, X]], 5]);
    assert(["a", "b", "c"].zip([1, 2, 3]), ["a", 1, "b", 2, "c", 3]);
    assert(eval(read('((fun (x) (+ 1 x)) 5)')), 6);
    assert(eval(read('(if 2 99 88)')), 99);
    assert(eval(read(`
        ((fun (n) 
           (if (<= n 2) n
             (* n (self (dec n))) ) ) 4)
           `)), 24);
    assert(eval(read(`
        ((fun fac (n) 
           (if (<= n 2) n
             (* n (fac (dec n))) ) ) 5)
           `)), 120);
}

function truthy (x) {
    if (Array.isArray(x) && x.length === 0) {
        return false;
    }
    else if (x === false || x === null || x === undefined) {
        return false;
    }
    return true;
}

function eval (x, e = GENV) {
    while (1) {
        if (Array.isArray(x)) {
            if (x[0] === DEF) {
                // (def k v)
                e.add_var(x[1], eval(x[2], e));
                return null;
            }
            else if (x[0] === SET) {
                // (def k v)
                e.set_var(x[1], eval(x[2], e));
                return null;
            }
            else if (x[0] === IF) {
                // (if cond conseq alt)
                let cond = eval(x[1], e);
                if (truthy(cond)) {
                    x = x[2];
                }
                else {
                    x = x[3];
                }
            }
            else if (x[0] === FUN) {
                // (fun nm (x) (+ x 1))
                //console.log("eval: creating fun: " + x);
                let nm, parms, body;
                if (x[1] instanceof Sym) {
                    //console.log("eval: fun: name provided");
                    nm = x[1];
                    parms = x[2];
                    body = x.slice(3);
                }
                else {
                    //console.log("eval: fun: name not provided");
                    nm = SELF;
                    parms = x[1];
                    body = x.slice(2);
                }
                let ret = new Fun(
                    e,
                    parms,
                    body,
                    nm
                );
                //e.add_var(nm, ret);
                //console.log("eval: create fun: parms: " + parms);
                return ret;
            }
            else {
                // function call..
                //console.log("eval: function or fun call: " + x);
                let y = x.map(function (xi) {
                    return eval(xi, e);
                });
                let fn = y.shift();
                let args = y;
                if (fn instanceof Function) {
                    //console.log("eval: fun call: " + x);
                    let ret = fn(...args);
                    return ret;
                }
                else if (fn instanceof Fun) {
                    //console.log("eval: Fun call: " + x);
                    x = fn.body;
                    e = new Env(
                        fn.e,
                        fn.parms.zip(args),
                        fn
                    );
                    //console.log("eval: next x: " + x);
                }
                else {
                    throw("eval: idk..");
                }
            }
        }
        else if (x instanceof Sym) {
            //console.log("eval: var lookup: " + x + ", e: " + e);
            let ret = e.find_var(x);
            //console.log("eval: var lookupd: " + ret);
            return ret;
        }
        else {
            return x;
        }
    } // while.
}

function Fun (e, parms, body, nm) {
    this.e = e;
    this.parms = parms;
    if (body.length > 1)
        body.unshift(DO);
    else
        body = body[0];
    this.body = body;
    this.nm = nm;
}

Fun.prototype.toString = function () {
    return "#Fun";
}

function inc (n) {
    return n + 1;
}

function dec (n) {
    return n - 1;
}

function plus (...xs) {
    return xs.reduce(function (a, b) {
        return a + b;
    });
}

function mult (...xs) {
    return xs.reduce(function (a, b) {
        return a * b;
    });
}

function lte (...xs) {
    return xs.reduce(function (a, b) {
        return a <= b;
    });
}

function Env (parent, xs, fn) {
    this.parent = parent;
    this.dict = new WeakMap();
    //prn("Env: xs: ", xs);
    for (let i = 0; i < xs.length; i += 2) {
        this.dict[xs[i]] = xs[i + 1];
    }
    //console.log("Env: dict: " + this.dict);
    if (fn) {
        this.dict[fn.nm] = fn;
    }
}

Env.prototype.add_var = function (k, v) {
    this.dict[k] = v;
}

Env.prototype.set_var = function (k, v) {
    if (this.dict[k]) {
        this.dict[k] = v;
    }
    else if (this.parent) {
        this.parent.set_var(k, v);
    }
}

Env.prototype.find_var = function (k) {
    if (this.dict[k]) {
        //console.log("Env: find_var: " + k);
        let ret = this.dict[k];
        //console.log("Env: find_var'd: " + ret);
        return ret;
    }
    else if (this.parent) {
        //console.log("Env: parent.find_var: " + k);
        return this.parent.find_var(k);
    }
    else {
        throw("Env: find_var: not found: " + k);
    }
}

function read (s) {
    return expand(parse(lex(s)));
}

let fs = require('fs');
function load (file) {
    let filename = file;
    const data = fs.readFileSync(filename, 'utf8')
    return eval(read(data));
}

function expand (x) {
    if (Array.isArray(x)) {
        if (x[0] === DEFN) {
            // (defn f (x) x) => (def f (fun (x) x))
            x.shift();
            let fname = x.shift();
            x.unshift(FUN);
            return [DEF, fname, expand(x)];
        }
        else if (x[0] === ARROW) {
            x.shift();
            let a = x.shift();
            return expand(expand_arrow(a, x));
        }
        else {
            return x.map(expand);
        }
    }
    else {
        return x;
    }
}

function replace_qmark (x, replacement) {
    if  (Array.isArray(x)) {
        return x.map(function (xi) {
            return replace_qmark(xi, replacement);
        });
    }
    else if (x === sym("?")) {
        return replacement;
    } else { return x;
    }
}

function expand_arrow (replacement, x) {
    if (x.length) {
        let ls = x.shift();
        let new_replacement = replace_qmark(ls, replacement);
        return expand_arrow(new_replacement, x);
    }
    else {
        return replacement;
    }
}

function lex (s) {
    return s.match(/"(?:\\"|[^"])*"|[()]|[^()\[\]{}\s\t\n]+/g);
}

function parse (toks) {
    let ret = ["do"];
    while (toks.length) {
        ret.push(parse1(toks));
    }
    return ret.length === 2 ? ret[1] : ret;
}

function Sym (name) {
    this.name = name;
}

Sym.prototype.toString = function () {
    return "$"+ this.name;
}

let sym = (function () {
    let cache = new WeakMap();
    return function (name) {
        if (!cache[name])
            cache[name] = new Sym(name);
        return cache[name];
    }
}());

function parse1 (toks) {
    let tok = toks.shift();
    if (tok === "(") {
        let ret = [];
        while (toks.length && toks[0] !== ")") {
            ret.push(parse1(toks));
        }
        assert(toks.shift(), ")");
        return ret;
    }
    else if (tok === "{") {
        let ret = [];
        while (toks.length && toks[0] !== "}") {
            ret.push(parse1(toks));
        }
        assert(toks.shift(), "}");
        ret.unshift(sym("dict"));
        return ret;
    }
    else if (tok[0] === '"') {
        return tok.substring(1, tok.length-1);
    }
    else if (!isNaN(tok)) {
        return +tok;
    }
    else {
        return sym(tok);
    }
}

function assert (a, b) {
    if (!eq_value(a, b)) {
        throw(a + " not= " + b);
    }
}

function eq_value (a, b) {
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
        for (let i = 0; i < a.length; i += 1) {
            if (!eq_value(a[i], b[i])) return false;
        }
        return true;
    }
    //console.log("a: " + a + ", b: " + b + ", "+ (a === b));
    return a === b;
}

main();
