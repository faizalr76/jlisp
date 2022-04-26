Array.prototype.toString = function () {
    return "[" + this.join(", ") + "]";
};


function main () {
    init();
    run_tests();
}

function init () {
    ARROW = sym("->");
    QMARK = sym("?");
    PLUS = sym("+");
    MULT = sym("*");
    SET = sym("set!");

    "def defn fun cat join map f x".split(" ").forEach(function (x) {
        global[x.toUpperCase()] = sym(x);
    });

    GENV = new Env(null, [PLUS, plus]);
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
}

function eval (x, e = GENV) {
    if (Array.isArray(x)) {
        if (x[0] === DEF) {
            // (def k v)
            e.add_var(x[1], eval(x[2], e));
        }
        else if (x[0] === SET) {
            // (def k v)
            e.set_var(x[1], eval(x[2], e));
        }
        else {
            // function call..
            //console.log("eval: fun call: " + x);
            let y = x.map(function (xi) {
                return eval(xi, e);
            });
            let fn = y.shift();
            let args = y;
            if (fn instanceof Function)
                return fn(...args);
            else
                throw("eval: idk");
        }
    }
    else if (x instanceof Sym) {
        console.log("eval: var lookup: " + x);
        return e.find_var(x);
    }
    else {
        return x;
    }
}

function plus (...xs) {
    return xs.reduce(function (a, b) {
        return a + b;
    });
}

function Env (parent, xs) {
    this.parent = parent;
    this.dict = new WeakMap();
    for (let i = 0; i < xs.length; i += 2) {
        this.dict[xs[i]] = xs[i + 1];
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
        console.log("Env: find_var: " + k);
        return this.dict[k];
    }
    else if (this.parent) {
        this.parent.find_var(k);
    }
}

function read (s) {
    return expand(parse(lex(s)));
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
