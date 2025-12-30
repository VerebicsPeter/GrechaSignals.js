import { Grecha } from "../grecha.js";
const { img, router, state$, derived$, lifecycle$, ite$ } = Grecha;

const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const kashaSoft = img("../Kasha.png");
const kashaHard = img("../KashaHard.gif");

const [count, setCount, watchCount] = state$(0);
const [kasha, setKasha, watchKasha] = state$(kashaSoft);
const [getToggle, setToggle] = state$(false);
const [doubleCount] = derived$(count, (x) => 2*x);
const [quadrupleCount] = derived$(doubleCount, (x) => 2*x);

watchCount((count) => {
  console.log(`Count changed to ${count}.`);
});

const onToggle = () => setToggle(!getToggle());

const Foo = div(h1("Foo"), p(LOREM), a("Home").att$("href", "#"));
const Bar = div(h1("Bar"), p(LOREM), a("Home").att$("href", "#"));

lifecycle$(Foo, {
  onMounted:()=>console.log("Foo mounted!"),
  onRemoved:()=>console.log("Foo removed!"),
});

const root = router({
  "/foo": Foo,
  "/bar": Bar,
  "/": div(
    h1("Grecha.js"),
    div(a("Foo").att$("href", "#/foo")),
    div(a("Bar").att$("href", "#/bar")),
    div("Count: ", input("number").bind$("value", count)),
    div("Count (x2): ", span(doubleCount)),
    div("Count (x4): ", span(quadrupleCount)),
    div("It's a: ", ite$(getToggle, span("foo"), span("bar")))
    .style$({ border: "1px solid black" })
    .on$("mouseenter", onToggle)
    .on$("mouseleave", onToggle),
    div(kasha)
    .style$({ cursor: "pointer" })
    .onclick$(() => {
        const newCount = count()+1
        setCount(newCount)
        setKasha((newCount % 2) ? kashaHard : kashaSoft)
      }
    )
  ),
});

entry.appendChild(root);
