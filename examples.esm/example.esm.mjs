import { Grecha } from "../grecha.js";
const { img, router, state$, derived$, ite$ } = Grecha;

const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
const kashaSoft = img("../Kasha.png");
const kashaHard = img("../KashaHard.gif");

const [num1] = state$(0);
const [num2] = state$(0);
const [getToggle, setToggle] = state$(false);
const [sum] = derived$([num1,num2], (v1,v2) => v1+v2);
const [diff] = derived$([num1,num2], (v1,v2) => v1-v2);
const [kashaHardness] = derived$(sum, (v) => v%2);

const onToggle = () => setToggle(!getToggle());

const Home = () => div(
  h1("Grecha.js"),
  div(a("Foo").att$("href", "#/foo")),
  div(a("Bar").att$("href", "#/bar")),
  div("a = ", input("number").bind$("value", num1)),
  div("b = ", input("number").bind$("value", num2)),
  div("a + b = ", span(sum)),
  div("a - b = ", span(diff)),
  div("It's a: ", ite$(getToggle, span("foo"), span("bar")))
  .style$({ border: "1px solid black" })
  .on$("mouseenter", onToggle)
  .on$("mouseleave", onToggle),
  div(ite$(kashaHardness, kashaHard, kashaSoft))
);

const Foo = () => {
  const [fooCount, setFooCount] = state$(0);

  return div(
    h1("Foo"),
    p(LOREM),
    p(fooCount),
    a("Home").att$("href", "#")
  ).hook$({
    onCreated:()=>setTimeout(() => setFooCount(69), 3000),
    onMounted:()=>console.log("Foo mounted!"),
    onRemoved:()=>console.log("Foo removed!"),
  });
};

const Bar = () => {
  const [isDark, setDark, watchDark] = state$(false);
  const lorem = p(LOREM);

  watchDark(dark => {
    if (dark) {
      lorem.style$({backgroundColor: "black", color: "white"});
    } else {
      lorem.style$({backgroundColor: "white", color: "black"});
    }
  });

  return div(
    h1("Bar"),
    lorem,
    div(button("dark: ", span(isDark)).onclick$(()=>setDark(!isDark()))),
    a("Home").att$("href", "#")
  );
};

const root = router({
  "/": Home(),
  "/foo": Foo(),
  "/bar": Bar(),
});

entry.appendChild(root);
