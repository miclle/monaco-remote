import { editor, IDisposable, Range, Selection } from "monaco-editor"
import pako from "pako"
import { RemoteCursorManager } from "./cursor.manager"
import { RemoteSelectionManager } from "./selection.manager"

export interface IEditorUser {
  uid: string
  color: string
  label: string
}

export interface IMessage {
  uid?: string
  message: Uint8Array
  timestamp?: number
}

export interface IMessageData {
  messageType: string
  data: any
}

export enum MessageDataType {
  CursorPosition  = "CursorPosition",
  CursorSelection = "CursorSelection",
  CodeSnippet     = "CodeSnippet"
}

/**
 * Realtime Message Channel Interface
 */
export interface IMessageChannel {
  sendMessage(message: IMessage): Promise<void>             // 发送消息
  onReceiver(listener: (message: IMessage) => any): void    // 接收消息
  onMemberJoined(listener: (memberId: string) => any): void // 用户加入
  onMemberLeft(listener: (memberId: string) => any): void   // 用户退出
}

export interface IEditorContentManagerOptions {
  editor: editor.IStandaloneCodeEditor
  channel?: IMessageChannel
}

export class EditorContentManager {

  editor: editor.IStandaloneCodeEditor // 编辑器
  channel?: IMessageChannel            // 消息通道

  private cursorManager?: RemoteCursorManager // 光标
  private selectionManager?: RemoteSelectionManager //
  private disposer?: IDisposable

  constructor(options: IEditorContentManagerOptions) {

    if (options.editor === undefined || options.editor === null) {
      throw new Error(`options.editor must be defined but was: ${options.editor}`)
    }

    this.editor = options.editor
    this.channel = options.channel

    if (this.channel === undefined) return

    this.cursorManager =  new RemoteCursorManager({
      editor: this.editor,
      tooltips: true,
      tooltipDuration: 20
    })

    this.selectionManager = new RemoteSelectionManager({
      editor: this.editor
    })

    this.channel.onMemberJoined((memberId: string) => {
      const user: IEditorUser = {
        uid: memberId,
        label: `User-${memberId}`,
        color: "blue"
      }
      this.cursorManager?.addCursor(user)
      this.selectionManager?.addSelection(user)
    })

    this.channel.onMemberLeft((memberId: string) => {
      this.cursorManager?.removeCursor(memberId)
      this.selectionManager?.removeSelection(memberId)
    })

    // 编辑器光标位置变化
    this.editor.onDidChangeCursorPosition((event: editor.ICursorPositionChangedEvent) => {
      this.editorCursorPositionChangeListener(event)
    })

    // 编辑器光标选择内容变化
    this.editor.onDidChangeCursorSelection((event: editor.ICursorSelectionChangedEvent) => {
      this.editorCursorSelectionChangedListener(event)
    })

    // 编辑器内容变化
    this.disposer = this.editor.onDidChangeModelContent((event: editor.IModelContentChangedEvent) => {
      this.sendCodeSnippet(event)
    })

    this.channel.onReceiver((message: IMessage) => {
      this.receiver(message)
    })
  }

  private sendMessage(message: IMessageData) {
    if (this.channel === undefined) return
    this.channel.sendMessage({ message: pako.deflate(JSON.stringify(message)) })
  }

  /**
   *
   * @param event
   */
  private editorCursorPositionChangeListener(event: editor.ICursorPositionChangedEvent) {
    this.sendMessage({ messageType: MessageDataType.CursorPosition, data: event })
  }

  /**
   *
   * @param event
   */
  private editorCursorSelectionChangedListener(event: editor.ICursorSelectionChangedEvent) {
    this.sendMessage({ messageType: MessageDataType.CursorSelection, data: event })
  }

  /**
   * Send code snippets
   * @param event An event describing a change in the text of a model.
   */
  private sendCodeSnippet(event: editor.IModelContentChangedEvent) {

    const model = this.editor.getModel()
    if (model === null) return

    if (event.versionId < model.getVersionId()) return

    this.sendMessage({ messageType: MessageDataType.CodeSnippet, data: event })
  }

  /**
   * Receive the changes and write them to the editor
   * @param message IMessage
   */
  private receiver(message: IMessage): void {

    if (message.uid === undefined) return

    const user: IEditorUser = {
      uid:   message.uid,
      label: `User-${message.uid}`,
      color: "blue"
    }

    this.cursorManager?.addCursor(user)
    this.selectionManager?.addSelection(user)

    const messageDate: IMessageData = JSON.parse(pako.inflate(message.message, { to: "string" }))

    switch (messageDate.messageType) {
      case MessageDataType.CodeSnippet:
        this.updateContent(message.uid, messageDate.data)
        break

      case MessageDataType.CursorPosition:
        this.updateCursorPosition(message.uid, messageDate.data)
        break

      case MessageDataType.CursorSelection:
        this.updateSelection(message.uid, messageDate.data)
        break

      default:
        break
    }
  }

  private updateContent(uid: string, event: editor.IModelContentChangedEvent) {
    const model = this.editor.getModel()
    if (model === null) return

    if (event.versionId <= model.getVersionId()) return

    event.changes.forEach((change: editor.IModelContentChange) => {
      const { range, rangeOffset, text } = change
      const _range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn)

      this.editor.executeEdits(uid, [{ range: _range, text, forceMoveMarkers: true }])

      const position = model.getPositionAt(rangeOffset + text.length)
      this.cursorManager?.setCursorPosition(uid, position)
    })
  }

  private updateCursorPosition(uid: string, event: editor.ICursorPositionChangedEvent) {
    const model = this.editor.getModel()
    if (model === null) return

    const offset = model.getOffsetAt(event.position)
    this.cursorManager?.setCursorOffset(uid, offset)
  }

  private updateSelection(uid: string, event: editor.ICursorSelectionChangedEvent) {
    const model = this.editor.getModel()
    if (model === null) return

    const selection: Selection = new Selection(
      event.selection.selectionStartLineNumber,
      event.selection.selectionStartColumn,
      event.selection.positionLineNumber,
      event.selection.positionColumn
    )

    const startOffset = model.getOffsetAt(selection.getStartPosition())
    const endOffset = model.getOffsetAt(selection.getEndPosition())
    this.selectionManager?.setSelectionOffsets(uid, startOffset, endOffset)
  }

  /**
   * Disposes of the content manager, freeing any resources.
   */
  public dispose(): void {
    this.disposer?.dispose()
  }

}
