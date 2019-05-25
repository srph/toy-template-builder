import * as React from 'react'
import { DragDropContextProvider,  __EXPERIMENTAL_DND_HOOKS_THAT_MAY_CHANGE_AND_BREAK_MY_BUILD__ as dnd } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
const { useDrag, useDragLayer, useDrop } = dnd

function DndProvider(props: { children: React.ReactNode }) {
  return (
    <DragDropContextProvider backend={HTML5Backend}>
      {props.children}
    </DragDropContextProvider>
  )
}

export {
  useDrag,
  useDragLayer,
  useDrop,
  DndProvider
}