import * as monaco from "monaco-editor"
import { IEditorUser } from "./RemoteManager"
import { RemoteCursorWidget } from "./RemoteCursorWidget"

export interface IRemoteCursorManagerOptions {
  editor: monaco.editor.IStandaloneCodeEditor
  tooltips: boolean
  tooltipDuration: number
}

const RemoteCursorManagerDefaultOptions = {
  tooltips: true,
  tooltipDuration: 1
}

export class RemoteCursorManager {

  private readonly cursorWidgets: Map<string, RemoteCursorWidget>
  private readonly options: IRemoteCursorManagerOptions

  constructor(options: IRemoteCursorManagerOptions) {

    if (options.editor === undefined || options.editor === null) {
      throw new Error(`options.editor must be defined but was: ${options.editor}`)
    }

    this.options = { ...RemoteCursorManagerDefaultOptions, ...options }
    this.cursorWidgets = new Map<string, RemoteCursorWidget>()
  }

  public addCursor(user: IEditorUser): RemoteCursorWidget {

    let cursorWidget = this.cursorWidgets.get(user.uid)
    if (cursorWidget !== undefined) return cursorWidget

    cursorWidget = new RemoteCursorWidget({
      editor:          this.options.editor,
      widgetId:        user.uid,
      color:           user.color,
      label:           user.label,
      tooltipEnabled:  this.options.tooltips,
      tooltipDuration: this.options.tooltipDuration * 1000,
      onDisposed:      () => this.removeCursor(user.uid)
    })

    this.cursorWidgets.set(user.uid, cursorWidget)
    return cursorWidget
  }

  public removeCursor(id: string): void {
    const cursorWidget = this.cursorWidgets.get(id)
    if (!cursorWidget?.isDisposed()) {
      cursorWidget?.dispose()
    }
    this.cursorWidgets.delete(id)
  }

  public setCursorPosition(id: string, position: monaco.IPosition) {
    const cursorWidget = this.cursorWidgets.get(id)
    cursorWidget?.setPosition(position)
  }

  public setCursorOffset(id: string, offset: number) {
    const cursorWidget = this.cursorWidgets.get(id)
    cursorWidget?.setOffset(offset)
  }

  public showCursor(id: string): void {
    const cursorWidget = this.cursorWidgets.get(id)
    cursorWidget?.show()
  }

  public hideCursor(id: string): void {
    const cursorWidget = this.cursorWidgets.get(id)
    cursorWidget?.hide()
  }
}
