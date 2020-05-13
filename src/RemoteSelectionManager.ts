import { editor, IPosition } from "monaco-editor"
import { RemoteSelection } from "./RemoteSelection"
import { IEditorUser } from "./RemoteManager"

/**
 * The IRemoteSelectionManagerOptions represents the options that
 * configure the behavior a the RemoteSelectionManager.
 */
export interface IRemoteSelectionManagerOptions {
  editor: editor.IStandaloneCodeEditor
}

/**
 * The RemoteSelectionManager renders remote users selections into the Monaco
 * editor using the editor's built-in decorators mechanism.
 */
export class RemoteSelectionManager {

  private readonly remoteSelections: Map<string, RemoteSelection>
  private readonly options: IRemoteSelectionManagerOptions

  constructor(options: IRemoteSelectionManagerOptions) {
    this.remoteSelections = new Map<string, RemoteSelection>()
    this.options = options
  }

  /**
   * Adds a new remote selection with a unique id and the specified color.
   * @param user
   */
  public addSelection(user: IEditorUser): RemoteSelection {

    let selection = this.remoteSelections.get(user.uid)
    if (selection !== undefined) return selection

    selection = new RemoteSelection({
      editor:     this.options.editor,
      id:         user.uid,
      color:      user.color,
      label:      user.color,
      onDisposed: () => this.removeSelection(user.uid)
    })

    this.remoteSelections.set(user.uid, selection)
    return selection
  }

  /**
   * Removes an existing remote selection from the editor.
   * @param id The unique id of the selection.
   */
  public removeSelection(id: string): void {
    const remoteSelection = this.remoteSelections.get(id)
    if (!remoteSelection?.isDisposed()) {
      remoteSelection?.dispose()
    }
  }

  /**
   * Sets the selection using zero-based text offset locations.
   * @param id The unique id of the selection.
   * @param start The starting offset of the selection.
   * @param end The ending offset of the selection.
   */
  public setSelectionOffsets(id: string, start: number, end: number): void {
    const remoteSelection = this.remoteSelections.get(id)
    remoteSelection?.setOffsets(start, end)
  }

  /**
   * Sets the selection using the Monaco Editor's IPosition (line numbers and columns) location concept.
   * @param id The unique id of the selection.
   * @param start The starting position of the selection.
   * @param end The ending position of the selection.
   */
  public setSelectionPositions(id: string, start: IPosition, end: IPosition): void {
    const remoteSelection = this.remoteSelections.get(id)
    remoteSelection?.setPositions(start, end)
  }

  /**
   * Shows the specified selection, if it is currently hidden.
   * @param id The unique id of the selection.
   */
  public showSelection(id: string): void {
    const remoteSelection = this.remoteSelections.get(id)
    remoteSelection?.show()
  }

  /**
   * Hides the specified selection, if it is currently shown.
   * @param id The unique id of the selection.
   */
  public hideSelection(id: string): void {
    const remoteSelection = this.remoteSelections.get(id)
    remoteSelection?.hide()
  }

}
