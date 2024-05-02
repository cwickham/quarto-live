import { basicSetup } from 'codemirror'
import { EditorView, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags } from "@lezer/highlight"
import { r } from 'codemirror-lang-r'

export type OJSElement = HTMLElement & { value: any };

type EditorOptions = { [key: string]: string };
type ExerciseButtonSpec = {
  text: string;
  icon: string;
  type: string;
  onclick?: ((ev: MouseEvent) => any);
}

const icons = {
  'arrow-repeat': require('./assets/arrow-repeat.svg') as string,
  lightbulb: require('./assets/lightbulb.svg') as string,
  play: require('./assets/play.svg') as string,
}

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--exercise-editor-hl-kw)" },
  { tag: tags.operator, color: "var(--exercise-editor-hl-op)" },
  { tag: tags.attributeName, color: "var(--exercise-editor-hl-at)" },
  { tag: tags.controlKeyword, color: "var(--exercise-editor-hl-cf)" },
  { tag: tags.comment, color: "var(--exercise-editor-hl-co)" },
  { tag: tags.string, color: "var(--exercise-editor-hl-st)" },
  { tag: tags.regexp, color: "var(--exercise-editor-hl-ss)" },
  { tag: tags.variableName, color: "var(--exercise-editor-hl-va)" },
  { tag: tags.bool, color: "var(--exercise-editor-hl-cn)" },
  { tag: tags.separator, color: "var(--exercise-editor-hl-cn)" },
  { tag: tags.literal, color: "var(--exercise-editor-hl-cn)" },
  { tag: [tags.number, tags.integer], color: "var(--exercise-editor-hl-dv)" },
  { tag: tags.function(tags.variableName), color: "var(--exercise-editor-hl-fu)" },
  { tag: tags.function(tags.attributeName), color: "var(--exercise-editor-hl-at)" },
]);

export class ExerciseEditor {
  code: string
  initialCode: string
  state: EditorState;
  view: EditorView;
  container: OJSElement;
  options: EditorOptions;
  reactiveViewof = [
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (!update.docChanged) return;
      this.code = update.state.doc.toString();
      this.container.value.code = this.code;
      this.container.dispatchEvent(new CustomEvent('input', {
        detail: { manual: false }
      }));
    }),
  ];

  constructor(container: OJSElement, code: string, options: EditorOptions) {
    if (typeof code !== "string") {
      throw new Error("Can't create editor, `code` must be a string.");
    }

    this.container = container;
    this.code = this.initialCode = code;
    this.options = options;
    this.state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        syntaxHighlighting(highlightStyle),
        this.reactiveViewof,
        r(),
      ],
    });

    this.view = new EditorView({
      state: this.state,
    });

    const dom = this.render();
    this.container.appendChild(dom);
    this.container.value = { code, options };

    // Prevent input Event when code autorun is disabled
    this.container.oninput = ((ev: CustomEvent) => {
      if (ev.detail.manual || this.options.autorun === 'true') {
        return;
      }
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }) as EventListener;
  }

  renderButton(spec: ExerciseButtonSpec) {
    const dom = document.createElement("a");
    const label = document.createElement("span");
    dom.className = `d-flex align-items-center gap-1 btn btn-${spec.type} text-nowrap`;
    label.innerText = spec.text;
    dom.innerHTML = icons[spec.icon];
    dom.appendChild(label);
    dom.onclick = spec.onclick || null;
    return dom;
  }

  renderButtonGroup(buttons: (HTMLButtonElement | HTMLAnchorElement)[]) {
    const group = document.createElement("div");
    group.className = "btn-group btn-group-sm";
    buttons.forEach((spec) => group.appendChild(spec));
    return group;
  }

  renderSpinner() {
    const dom = document.createElement("div");
    dom.className = "webr-eval-indicator d-none spinner-grow spinner-grow-sm";
    dom.setAttribute("role", "status");
    return dom;
  }

  render() {
    const card = document.createElement("div");
    const header = document.createElement("div");
    const body = document.createElement("div");
    card.className = "card editor-container my-3";
    header.className = "card-header d-flex justify-content-between";
    body.className = "card-body p-0";

    const left = document.createElement("div");
    left.className = "d-flex align-items-center gap-3";
    const label = document.createElement("div");
    label.innerHTML = this.options.caption;
    left.appendChild(label);

    const leftButtons: (HTMLButtonElement | HTMLAnchorElement)[] = [];
    if (this.options.startover === 'true') {
      leftButtons.push(this.renderButton({
        text: "Start Over",
        icon: "arrow-repeat",
        type: "outline-dark",
        onclick: () => {
          this.view.dispatch({
            changes: {
              from: 0,
              to: this.view.state.doc.length,
              insert: this.initialCode,
            }
          });
        }
      }));
    }

    if (false) {
      leftButtons.push(this.renderButton({
        text: "Show Hint",
        icon: "lightbulb",
        type: "outline-dark",
      }));
    }
    left.appendChild(this.renderButtonGroup(leftButtons));
    header.appendChild(left);

    let right = document.createElement("div");
    right.className = "d-flex align-items-center gap-3";

    const rightButtons: (HTMLButtonElement | HTMLAnchorElement)[] = [];
    if (this.options.autorun !== 'true') {
      rightButtons.push(this.renderButton({
        text: "Run Code",
        icon: "play",
        type: "primary",
        onclick: () => {
          this.container.value.code = this.code;
          this.container.dispatchEvent(new CustomEvent('input', {
            detail: { manual: true }
          }));
        }
      }));
    }

    right.appendChild(this.renderSpinner());

    if (false) {
      rightButtons.push(
        this.renderButton({ text: "Submit Answer", icon: "lightbulb", type: "primary" }),
      );
    }
    right.appendChild(this.renderButtonGroup(rightButtons));

    header.appendChild(right);
    card.appendChild(header);

    body.appendChild(this.view.dom);
    card.appendChild(body);
    return card;
  }
}