import { editor, IDisposable, IPosition } from "monaco-editor"

export interface IRemoteCursorWidgetOptions {
  editor: editor.IStandaloneCodeEditor
  widgetId: string
  color: string
  label: string
  tooltipEnabled: boolean
  tooltipDuration: number
  onDisposed: () => void
}

export class RemoteCursorWidget implements editor.IContentWidget, IDisposable {

  private readonly id: string

  private readonly editor: editor.IStandaloneCodeEditor
  private readonly domNode: HTMLDivElement
  private readonly tooltipNode: HTMLDivElement | null
  private readonly tooltipDuration: number
  private readonly scrollListener: IDisposable | null
  private readonly onDisposed: () => void

  private position: editor.IContentWidgetPosition | null = null
  private hideTimer: any
  private disposed: boolean

  constructor(options: IRemoteCursorWidgetOptions) {
    this.editor = options.editor
    this.tooltipDuration = options.tooltipDuration
    this.id = `monaco-remote-cursor-${options.widgetId}`
    this.onDisposed = options.onDisposed

    const lineHeight = this.editor.getOption(editor.EditorOption.lineHeight)

    // Create the main node for the cursor element.
    this.domNode = document.createElement("div")
    this.domNode.className = "monaco-remote-cursor"
    this.domNode.style.background = options.color
    this.domNode.style.height = `${lineHeight}px`

    // Create the tooltip element if the tooltip is enabled.
    if (options.tooltipEnabled) {
      this.tooltipNode = document.createElement("div")
      this.tooltipNode.className = "monaco-remote-cursor-tooltip"
      this.tooltipNode.style.background = options.color
      this.tooltipNode.innerHTML = options.label
      this.domNode.appendChild(this.tooltipNode)

      // we only need to listen to scroll positions to update the tooltip location on scrolling.
      this.scrollListener = this.editor.onDidScrollChange(() => {
        this.updateTooltipPosition()
      })
    } else {
      this.tooltipNode = null
      this.scrollListener = null
    }

    this.hideTimer = null
    this.editor.addContentWidget(this)
    this.disposed = false
  }

  public hide(): void {
    this.domNode.style.display = "none"
  }

  public show(): void {
    this.domNode.style.display = "inherit"
  }

  public setOffset(offset: number): void {
    const model = this.editor.getModel()
    if (model === null) return

    const position = model.getPositionAt(offset)
    this.setPosition(position)
  }

  public setPosition(position: IPosition): void {
    this.updatePosition(position)

    if (this.tooltipNode !== null) {
      setTimeout(() => this.showTooltip(), 0)
    }
  }

  public setPositionWithModelContentChange(change: editor.IModelContentChange) {
    const model = this.editor.getModel()
    if (model === null) return

    const { rangeOffset, text } = change
    const position = model.getPositionAt(rangeOffset + text.length)
    this.updatePosition(position)
  }

  public isDisposed(): boolean {
    return this.disposed
  }

  /**
   * IDisposable implement method
   */
  public dispose(): void {
    if (this.disposed) {
      return
    }

    this.editor.removeContentWidget(this)

    if (this.scrollListener !== null) {
      this.scrollListener.dispose()
    }

    this.disposed = true
    this.onDisposed()
  }

  /**
   * editor.IContentWidget implement method
   */
  public getId(): string {
    return this.id
  }

  /**
   * editor.IContentWidget implement method
   */
  public getDomNode(): HTMLElement {
    return this.domNode
  }

  /**
   * editor.IContentWidget implement method
   */
  public getPosition(): editor.IContentWidgetPosition | null {
    return this.position
  }

  private updatePosition(position: IPosition): void {
    this.position = {
      position: { ...position },
      preference: [editor.ContentWidgetPositionPreference.EXACT]
    }

    this.editor.layoutContentWidget(this)
  }

  private showTooltip(): void {
    this.updateTooltipPosition()

    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer)
    } else {
      this.setTooltipVisible(true)
    }

    this.hideTimer = setTimeout(() => {
      this.setTooltipVisible(false)
      this.hideTimer = null
    }, this.tooltipDuration)
  }

  private updateTooltipPosition(): void {
    if (this.tooltipNode === null) return
    const distanceFromTop = this.domNode.offsetTop - this.editor.getScrollTop()
    this.tooltipNode.style.top = distanceFromTop - this.tooltipNode.offsetHeight < 5 ? `${this.tooltipNode.offsetHeight + 2}px` : `-${this.tooltipNode.offsetHeight}px`
    this.tooltipNode.style.left = "0"
  }

  private setTooltipVisible(visible: boolean): void {
    if (this.tooltipNode === null) return
    this.tooltipNode.style.opacity = visible ? "1.0" : "0"
  }

}
