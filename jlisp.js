// TODO
// ? use Map instead of WeakMap
// / elem
// / cat
// / map
// / filter
// / keyword
// / join
// / dict
// / println, prn
// / if
// / fun

MACROS = new Map();

function Sym (name) {
    this.name = name;
}

Sym.prototype.toString = function () {
    return this.name;
}

let sym = (function () {
    let cache = new WeakMap();
    return function (name) {
        if (!cache[name])
            cache[name] = new Sym(name);
        return cache[name];
    }
}());

let gensym = (function () {
    let n = 0;
    return function (name) {
        n += 1;
        return sym("#" + n);
    }
}());

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

Array.prototype.unzip = function () {
    let parms = [];
    let args = [];
    for (let i = 0; i < this.length; i += 2) {
        parms.push(this[i]);
        args.push(this[i + 1]);
    }
    return [parms, args];
};

Map.prototype.toString = function () {
    let ret = [];
    let ks = this.keys();
    let last = this.size;
    console.log("Map: last: " + last);
    last = last < 10 ? last : 10;
    for (let i = 0; i < last; i += 1) {
        let k = ks.next().value;
        ret.push (k + ": " + this.get(k));
    }
    return "(dict " + ret.join(", ") + ")";
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
    PERCENT = sym("%");
    PLUS = sym("+");
    MULT = sym("*");
    SET = sym("set!");

    "nil false def quote defn fun self apply if do cat join map f x".split(" ").forEach(function (x) {
        global[x.toUpperCase()] = sym(x);
    });

    GENV = new Env(null, [PLUS, plus, sym("*"), mult, sym("<="), lte, sym("inc"), inc, sym("dec"), dec,
        sym("<"), lt, sym(">"), gt,
        sym("prn"), prn, sym("println"), println, sym("elem"), elem, sym("dict"), dict, 
        sym("list"), list, sym("cat"), cat, sym("join"), join, sym("cons"), cons, sym("car"), car,
        sym("cdr"), cdr, sym("="), eq, sym("keys"), keys, sym("reverse!"), reverse_bang, 
        sym("even?"), is_even, sym("in"), js_in, sym("cdr!"), cdr_bang, sym("identity"), identity,
        sym("filter"), js_filter, sym("find"), js_find, sym("map"), js_map, sym("has?"), js_has, 
        sym("not"), js_not
        ]);

    /*
    eval(read(`
        (defn map (f ls)
          (defn g (ls acc)
            (if ls
              (g (cdr ls) (cons (f (car ls)) acc))
              (reverse! acc) ) )
          (g ls nil) )

        ;=
        (defn filter (f ls)
          (defn g (ls acc)
            (if ls
              (if (f (car ls))
                (g (cdr ls) (cons (car ls) acc))
                (g (cdr ls) acc) )
              (reverse! acc) ) )
          (g ls '()) )

    (defn find (f ls)
      (if (f (car ls))
          (car ls)
          (find f (cdr ls)) ) )
           =;

    `)); */
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
    assert(replace_qmark([sym("join"), PERCENT, " "], sym("x")), [JOIN, X, " "]);
    assert(replace_qmark([PLUS, 1, [MULT, 2, PERCENT]], X), [PLUS, 1, [MULT, 2, X]]);
    assert(read('(-> x (map f %) (join % " "))'), [JOIN, [MAP, F, X], " "]);
    assert(eval(read('(+ 2 3)')), 5);
    assert(eval(read('((fun () (+ 1 3)))')), 4);
    assert(read('((fun (x) (+ 1 x)) 5)'), [[FUN, [X], [PLUS, 1, X]], 5]);
    assert(["a", "b", "c"].zip([1, 2, 3]), ["a", 1, "b", 2, "c", 3]);
    assert(eval(read('((fun (x) (+ 1 x)) 5)')), 6);
    assert(eval(read('(if 2 99 88)')), 99);
    assert(read('(elem {:a "alif" :b "ba"} :b)'), 
        [sym("elem"), [sym("dict"), keyword(":a"), "alif", keyword(":b"), "ba"], keyword(":b")]);
    assert(eval(read('(elem {:a "alif" :b "ba"} :b)')), "ba");
    assert(eval(read("(map inc '(1 2 3))")), [2, 3, 4]);

    assert(eval(read("(filter even? '(1 2 3 4))")), [2, 4]);
    assert(eval(read("(filter (fun (n) (= n 2)) '(1 2 3 4))")), [2]);

    assert(eval(read("(find even? '(1 2 3))")), 2);
    assert(eval(read("(set! '(1 2 3) 1 22)")), [1, 22, 3]);
    assert(eval(read("true")), true);
    assert(eval(read(":bucket")), keyword(":bucket"));
    assert(eval(read("false")), false);
    assert(eval(read("(cons 1 nil)")), [1]);
    assert(eval(read("(if '() 11 22)")), 22);
    assert(eval(read("(if nil 11 22)")), 22);
    assert(eval(read("(if false 11 22)")), 22);
    assert(eval(read("(if true 11 22)")), 11);
    assert(eval(read("(in '(1 2 3) 2)")), true);
    assert(eval(read("(cdr '(1))")), []);
    assert(eval(read("(= (elem '(:frog :whiskey :bucket) 2) :bucket)")), true);
    assert(eval(read("(map identity '(:frog :whiskey :bucket))")), 
           [keyword(":frog"), keyword(":whiskey"), keyword(":bucket")]);
    assert(eval(read("(car (map identity '(:frog :whiskey :bucket)))")), keyword(":frog"));
    assert(eval(read("(in '(:frog :whiskey :bucket) :bucket)")), true);
    assert(eval(read("(in (cdr '(:frog :whiskey :bucket)) :bucket)")), true);
    assert(eval(read("(in (keys (dict :frog 1 :whiskey 2 :bucket 3)) :bucket)")), true);
    assert(jlisp("(let (a 1 b 2) (+ a b))"), 3);
    assert(jlisp("(and 11)"), 11);
    assert(jlisp("(and 11 22)"), 22);
    assert(jlisp("(and 11 22 33)"), 33);
    assert(jlisp("(and 11 nil 33)"), []);
    //prn(read("(and nil 22 33)"));
    //prn(read("(and false 22 33)"));
    //throw("exit");
    assert(jlisp("(and false 22 33)"), false);
    assert(jlisp("(and (> 1 2) 22 33)"), false);
    console.log("tests completed.");

    assert(eval(read(`
        ;=((fun (n) 
           (if (<= n 2) n
             (* n (self (dec n))) ) )=; 4 ;)
           `)), 4);

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

function jlisp (s) {
    return eval(read(s));
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
    //console.log("eval: x: " + x);
    try {
    while (1) {
        if (Array.isArray(x)) {
            if (x[0].length === 0) {
                return x;
            }
            else if (x[0] === APPLY) {
                // [apply dict [:a 1]] => [dict :a 1]
                x = cons(x[1], x[2]);
            }
            else if (x[0] === DEF) {
                // (def k v)
                e.add_var(x[1], eval(x[2], e));
                return null;
            }
            else if (x[0] === SET) {
                if (x.length === 3) {
                    // (set! k v)
                    let k = x[1], 
                        v = eval(x[2], e);
                    e.set_var(x[1], v);
                    return v;
                }
                else if (x.length === 4) {
                    // (set! obj k v)
                    let obj = eval(x[1], e), 
                        k = eval(x[2], e), 
                        v = eval(x[3], e);
                    if (obj instanceof Map) {
                        obj.set(k, v);
                    }
                    else {
                        obj[k] = v;
                    }
                    return obj;
                }
            }
            else if (x[0] === QUOTE) {
                return x[1];
            }
            else if (x[0] === DO) {
                for (let i = 1; i < x.length - 1; i += 1) {
                    eval(x[i], e);
                }
                x = x[x.length - 1];
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
                    throw("eval: idk: " + to_str(x));
                }
            }
        }
        else if (x === NIL) {
            return [];
        }
        else if (x === false || x === true) {
            //println("eval: return boolean: ", x);
            return x;
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
    catch (e) {
        console.log("eval: error: " + e + ", x: " + x);
        throw(e);
    }
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

Fun.prototype.call = function (ignore, ...args) {
    let pargs = this.parms.zip(args);
    //console.log("Fun: pargs: " + pargs);
    return eval(this.body,
         new Env(
            this.e,
            pargs, //this.parms.zip(arg),
            this) );
}
  
function js_not(x) {
    return !truthy(x);
}

function js_has (obj, k) {
    //println("has?: obj: ", obj, ", k: ", k);
    if (obj instanceof Map) {
        return obj.has(k);
    }
    else if(Array.isArray(obj)) {
        return obj.includes(k);
    }
    else {
        throw("js_has: error: obj is not Array or Map");
    }
}

function js_filter (f, xs) {
    let ret = [];
    xs.forEach(function (x) {
        //console.log("filter: x: " + x);
        if (truthy(f.call(null, x))) {
            ret.push(x);
        }
    });
    return ret;
}
  
function js_map (f, xs) {
    //console.log("js_map: xs: " + xs);
    let ret = [];
    for (let i = 0; i < xs.length; i += 1) {
        ret.push(f.call(null, xs[i]));
    }
    return ret;
}
  
function js_find (f, xs) {
    for (let i = 0; i < xs.length; i += 1) {
        if (truthy(f.call(null, xs[i]))) {
            return xs[i];
        }
    }
    return [];
}

function car (ls) {
    if (!Array.isArray(ls)) throw("car: expected list, not: " + ls);
    //println("car: ls: ", ls, ", ls[0]: ", ls[0]);
    return ls[0];
}

function cdr_bang (ls) {
    if (!Array.isArray(ls))
        throw("cdr: expected array, not: " + ls);
    ls.shift();
    return ls;
}

function cdr (ls) {
    if (!Array.isArray(ls))
        throw("cdr: expected array, not: " + ls);
    return ls.slice(1);
}

function cons (a, b) {
    return [a].concat(b);
}

function join (ls, sep) {
    return ls.join(sep);
}

function cat (...args) {
    return args.join("");
}

function list (...args) {
    return args;
}

function reverse_bang (ls) {
    return ls.reverse();
}

function keys (obj) {
    if (obj instanceof Map) {
        let ret = [];
        for (var x of obj) {
            ret.push(x[0]);
        }
        //prn("keys: ret: ", ret, ", array? : ", Array.isArray(ret));
        return ret;
    } else {
        return Object.keys(obj);
    }
}

function dict (...args) {
    let ret = new Map();
    for (let i = 0; i < args.length; i += 2) {
        ret.set(args[i], args[i + 1]);
    }
    return ret;
}

function elem (obj, k, alt) {
    if (obj instanceof Map) {
        return obj.get(k) || alt;
    } else {
        return obj[k] || alt;
    }
}

function is_even (n) {
    let ret = n % 2 === 0;
    //console.log("is_even: n: ", n, ", ret: " + ret);
    return ret;
}

function identity (x) {
    return x;
}

function inc (n) {
    return n + 1;
}

function dec (n) {
    return n - 1;
}

function js_in (obj, x) {
    if (obj instanceof Map) {
        return obj.has(x);
    } else if (Array.isArray(obj) ){
        return obj.includes(x);
    } else {
        return "in() only works on Map and Array !";
    }
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

function gt (...xs) {
    return xs.reduce(function (a, b) {
        return a > b;
    });
}

function gte (...xs) {
    return xs.reduce(function (a, b) {
        return a >= b;
    });
}

function lt (...xs) {
    return xs.reduce(function (a, b) {
        return a < b;
    });
}

function lte (...xs) {
    return xs.reduce(function (a, b) {
        return a <= b;
    });
}

function Env (parent, xs, fn) {
    this.parent = parent;
    this.dict = new Map();
    //prn("Env: xs: ", xs);
    for (let i = 0; i < xs.length; i += 2) {
        this.dict.set(xs[i], xs[i + 1]);
    }
    //console.log("Env: dict: " + this.dict);
    if (fn) {
        this.dict.set(fn.nm, fn);
    }
}

Env.prototype.add_var = function (k, v) {
    this.dict.set(k, v);
}

Env.prototype.set_var = function (k, v) {
    if (this.dict.has(k)) {
        this.dict.set(k, v);
    }
    else if (this.parent) {
        this.parent.set_var(k, v);
    }
}

/*
Env.prototype.set_obj = function (obj, k, v) {
    if (this.dict.has(obj)) {
        this.dict.set(obj][k], v);
    }
    else if (this.parent) {
        this.parent.set_obj(obj, k, v);
    }
}*/

Env.prototype.find_var = function (k) {
    if (this.dict.has(k)) {
        //console.log("Env: find_var: " + k);
        let ret = this.dict.get(k);
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
        if (MACROS.has(x[0])) {
            //console.log("expand: calling macro: x: " + x);
            let args = x.slice(1);
            let ast = MACROS.get(x[0]).apply(null, args);
            return expand(ast);
        }
        else {
            return x.map(expand);
        }
    }
    else {
        return x;
    }
}

MACROS.set(sym("defn"), transform_defn);
function transform_defn (...args) {
    // (defn f (x) x) => (def f (fun (x) x))
    console.log("transform_defn: args: " + args);
    let fname = args[0];
    let body = [FUN].concat(args.slice(1));
    return [DEF, fname, expand(body)];
}

MACROS.set(sym("->"), transform_arrow);
function transform_arrow (replacement, ...x) {
    if (x.length) {
        let ls = x.shift();
        let new_replacement = replace_qmark(ls, replacement);
        return transform_arrow(new_replacement, ...x);
    }
    else {
        return replacement;
    }
}

function replace_qmark (x, replacement) {
    if  (Array.isArray(x)) {
        return x.map(function (xi) {
            return replace_qmark(xi, replacement);
        });
    }
    else if (x === sym("%")) {
        return replacement;
    } 
    else { 
        return x;
    }
}

MACROS.set(sym("let"), transform_let);
function transform_let (...x) {
    // (let (a 1 b 2) (+ a b)) => ((fun (a b) (+ a b)) 1 2)
    let pargs = x[0].unzip();
    let parms = pargs[0];
    let args = pargs[1];
    let body = x.slice(1);
    return [[FUN, parms].concat(body)].concat(args);
}

MACROS.set(sym("and"), transform_and);
function transform_and (...x) {
    if (x.length === 1) {
        return x[0];
    }
    else if (x.length > 1) {
        let rest = x.slice(1);
        let k = gensym();
        let ret = [sym("let"), [k, x[0]],
                 [IF, k, [sym("and")].concat(rest), k]];
        return ret;
    }
}

function lex (s) {
    s = s.replace(/;=[\s\S]+?=;/g, "");
    s = s.replace(/;.*/g, "");
    return s.match(/"(?:\\"|[^"])*"|[(){}%]|[^()\[\]{}\s\t\n]+/g);
}

function parse (toks) {
    let ret = [DO];
    while (toks.length) {
        ret.push(parse1(toks));
    }
    return ret.length === 2 ? ret[1] : ret;
}

function Keyword (name) {
    this.name = name;
}

Keyword.prototype.toString = function () {
    return this.name;
}

let keyword = (function () {
    let cache = new WeakMap();
    return function (name) {
        if (!cache[name])
            cache[name] = new Keyword(name);
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
    else if (tok === ")") {
        throw("unexpected ..)..");
    }
    else if (tok === "{") {
        let ret = [];
        while (toks.length && toks[0] !== "}") {
            ret.push(parse1(toks));
        }
        assert(toks.shift(), "}");
        ret.unshift(sym("dict"));
        //println("parse1: dict: ", to_str(ret));
        return ret;
    }
    else if (tok === "'") {
        return [QUOTE, parse1(toks)];
    }
    else if (tok[0] === '"') {
        return tok.substring(1, tok.length-1);
    }
    else if (tok[0] === ':') {
        //println("parse1: keyword: ", to_str(tok));
        return keyword(tok);
    }
    else if (tok === "true") {
        return true;
    }
    else if (tok === "false") {
        return false;
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
        throw(to_str(a) + " not= " + to_str(b));
    }
}

function eq (a, b) {
    return a === b;
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

