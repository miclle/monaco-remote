import { editor, Range, IPosition } from "monaco-editor"

export interface IRemoteSelectionOptions {
  editor: editor.IStandaloneCodeEditor
  id: string
  color: string
  label: string
  onDisposed: () => void
}

export class RemoteSelection {

  private readonly editor: editor.IStandaloneCodeEditor
  private readonly id: string
  private readonly label: string
  private readonly onDisposed: () => void

  private readonly className: string
  private readonly styleElement: HTMLStyleElement

  private startPosition?: IPosition
  private endPosition?: IPosition
  private decorations: string[]
  private disposed: boolean = false

  constructor(options: IRemoteSelectionOptions) {
    this.editor     = options.editor
    this.id         = options.id
    this.label      = options.label
    this.onDisposed = options.onDisposed

    const uniqueClassId = `monaco-remote-selection-${options.id}`
    this.className      = `monaco-remote-selection ${uniqueClassId}`
    this.styleElement   = RemoteSelection.addDynamicStyleElement(uniqueClassId, options.color)
    this.decorations    = []
  }

  /**
   * A helper method to add a style tag to the head of the document that will
   * style the color of the selection. The Monaco Editor only allows setting
   * the class name of decorations, so we can not set a style property directly.
   * This method will create, add, and return the style tag for this element.
   *
   * @param className The className to use as the css selector.
   * @param color The color to set for the selection.
   * @returns The style element that was added to the document head.
   */
  private static addDynamicStyleElement(className: string, color: string): HTMLStyleElement {
    const css = `.${className} { background-color: ${color} }`.trim()
    const styleElement = document.createElement("style")
    styleElement.innerText = css
    document.head.appendChild(styleElement)

    return styleElement
  }

  /**
   * A helper method to ensure the start position is before the end position.
   * @param start The current start position.
   * @param end The current end position.
   * @return An object containing the correctly ordered start and end positions.
   */
  private static swapIfNeeded(start: IPosition, end: IPosition): { start: IPosition, end: IPosition } {
    if (start.lineNumber < end.lineNumber || (start.lineNumber === end.lineNumber && start.column <= end.column)) {
      return { start, end }
    } else {
      return { start: end, end: start }
    }
  }

  /**
   * Gets the userland id of this selection.
   */
  public getId(): string {
    return this.id
  }

  /**
   * Gets the start position of the selection.
   */
  public getStartPosition(): IPosition | null {
    if (this.startPosition === undefined) return null
    return { ...this.startPosition }
  }

  /**
   * Gets the start position of the selection.
   */
  public getEndPosition(): IPosition | null {
    if (this.endPosition === undefined) return null
    return { ...this.endPosition }
  }

  /**
   * Sets the selection using zero-based text indices.
   * @param start The start offset to set the selection to.
   * @param end The end offset to set the selection to.
   */
  public setOffsets(start: number, end: number): void {
    const model = this.editor.getModel()
    if (model === null) return

    const startPosition = model.getPositionAt(start)
    const endPosition = model.getPositionAt(end)

    this.setPositions(startPosition, endPosition)
  }

  /**
   * Sets the selection using Monaco's line-number / column coordinate system.
   * @param start The start position to set the selection to.
   * @param end The end position to set the selection to.
   */
  public setPositions(start: IPosition, end: IPosition): void {
    // this.decorations = this.editor.deltaDecorations(this.decorations, [])
    const ordered = RemoteSelection.swapIfNeeded(start, end)
    this.startPosition = ordered.start
    this.endPosition = ordered.end
    this.render()
  }

  /**
   * Makes the selection visible if it is hidden.
   */
  public show(): void {
    this.render()
  }

  /**
   * Makes the selection hidden if it is visible.
   */
  public hide(): void {
    this.decorations = this.editor.deltaDecorations(this.decorations, [])
  }

  /**
   * Determines if the selection has been permanently removed from the editor.
   */
  public isDisposed(): boolean {
    return this.disposed
  }

  /**
   * Permanently removes the selection from the editor.
   */
  public dispose(): void {
    if (!this.disposed) {
      if (this.styleElement.parentElement !== null) {
        this.styleElement.parentElement.removeChild(this.styleElement)
      }
      this.hide()
      this.disposed = true
      this.onDisposed()
    }
  }

  /**
   * A helper method that actually renders the selection as a decoration within the Monaco Editor.
   */
  private render(): void {
    if (this.startPosition === undefined || this.endPosition === undefined) return

    const range = new Range(this.startPosition.lineNumber, this.startPosition.column, this.endPosition.lineNumber, this.endPosition.column)
    const options = {
      className: this.className,
      hoverMessage: this.label != null ? { value: this.label } : null
    }

    this.decorations = this.editor.deltaDecorations(this.decorations, [{ range, options }])
  }

}
