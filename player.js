((exports) => {
  exports.expandAnnotationSequence = expandAnnotationSequence
  exports.nextTurnNumber = nextTurnNumber
  exports.proliferateChanges = proliferateChanges
  exports.refreshAnnotations = refreshAnnotations
  exports.setupAnnotations = setupAnnotations

  let parser, container, turnList, lastRenderedPGN, timeline

  if (typeof require !== 'undefined') {
    parser = require('pgn-parser')
  }
  function setupAnnotations () {
    container = document.querySelector('.annotations-container')
    turnList = document.querySelector('.turn-list')
    document.onmousedown = startHighlightArrow
    document.onmouseturn = previewHighlightArrow
    document.onmouseup = stopHighlightArrow
    if (typeof window !== 'undefined') {
      parser = window.parser
    }
  }

  function refreshAnnotations () {
    if (!turnList || container.style.display === 'none') {
      return
    }
    if (lastRenderedPGN !== window.pgn) {
      timeline = 1
      lastRenderedPGN = window.pgn
      turnList.innerHTML = ''
      turnList.classList.add('timeline1')
      renderTurns(window.pgn.turns, turnList)
    }
    if (document.body.offsetHeight > document.body.offsetWidth) {
      turnList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
    } else {
      turnList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - 1) + 'px'
    }
  }

  function expandSequence (sequence, expandAnnotations) {
    const expanded = [' ']
    for (const item of sequence) {
      if (!expandAnnotations || !item.startsWith('{')) {
        expanded.push(item, ' ')
        continue
      }
      const annotationParts = expandAnnotationSequence(item)
      for (const part of annotationParts) {
        expanded.push(part, ' ')
      }
    }
    return expanded
  }

  function findClosingBracket (index, array) {
    let openParantheses = 0
    let openSquare = 0
    let openBrace = 0
    const bracket = array[index].charAt(0)
    let finish = index
    while (finish < array.length) {
      let part = '' + array[finish]
      if (bracket === '(') {
        while (part.indexOf('(') > -1) {
          openParantheses++
          part = part.replace('(', '')
        }
        while (part.indexOf(')') > -1) {
          openParantheses--
          part = part.replace(')', '')
        }
      } else if (bracket === '{') {
        while (part.indexOf('{') > -1) {
          openBrace++
          part = part.replace('{', '')
        }
        while (part.indexOf('}') > -1) {
          openBrace--
          part = part.replace('}', '')
        }
      } else if (bracket === '[') {
        while (part.indexOf('[') > -1) {
          openSquare++
          part = part.replace('[', '')
        }
        while (part.indexOf(']') > -1) {
          openSquare--
          part = part.replace(']', '')
        }
      }
      if (!openParantheses && !openSquare && !openBrace) {
        return finish + 1
      }
      finish++
    }
    return finish
  }

  function expandAnnotationSequence (annotationSequence) {
    if (annotationSequence === '{}') {
      return ['{', '}']
    }
    const lineParts = ['{']
    let copy = annotationSequence.substring(1, annotationSequence.length - 1).trim()
    while (copy.length) {
      const firstCharacter = copy.charAt(0)
      if (firstCharacter === '$') {
        const nag = copy.substring(0, copy.indexOf(' '))
        lineParts.push(nag)
        copy = copy.substring(nag.length).trim()
        continue
      }
      if (firstCharacter === '[') {
        const highlight = copy.substring(0, copy.indexOf(']') + 1)
        lineParts.push(highlight)
        copy = copy.substring(highlight.length).trim()
        continue
      }
      if (firstCharacter === '(') {
        const closingIndex = findClosingBracket(0, copy)
        const nestedTurns = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedTurns)
        copy = copy.substring(nestedTurns.length).trim()
        continue
      }
      if (firstCharacter === '{') {
        const closingIndex = findClosingBracket(0, copy)
        const nestedAnnotation = copy.substring(0, closingIndex + 1)
        lineParts.push(nestedAnnotation)
        copy = copy.substring(nestedAnnotation.length).trim()
        continue
      }
      const nextSegment = copy.substring(0, firstInterruption(copy))
      copy = copy.substring(nextSegment.length).trim()
      lineParts.push(nextSegment)
    }
    lineParts.push('}')
    return lineParts
  }

  function firstInterruption (text) {
    const nextBrace = text.indexOf('{')
    const nextParanthesis = text.indexOf('(')
    const nextSquare = text.indexOf('[')
    const nextDollar = text.indexOf('$')
    if (nextBrace === -1 && nextParanthesis === -1 && nextSquare === -1 && nextDollar === -1) {
      return text.length
    }
    const valid = []
    if (nextBrace > -1) {
      valid.push({ nextBrace, value: nextBrace })
    }
    if (nextParanthesis > -1) {
      valid.push({ nextParanthesis, value: nextParanthesis })
    }
    if (nextSquare > -1) {
      valid.push({ nextSquare, value: nextSquare })
    }
    if (nextDollar > -1) {
      valid.push({ nextDollar, value: nextDollar })
    }
    valid.sort((a, b) => {
      return a.value > b.value ? 1 : -1
    })
    return valid[0].value
  }

  function contractExpandedSequence (sequence) {
    let joined = sequence.join(' ').trim()
    while (joined.indexOf('  ') > -1) {
      joined = joined.split('  ').join(' ')
    }
    while (joined.indexOf('{ ') > -1) {
      joined = joined.split('{ ').join('{')
    }
    while (joined.indexOf(' }') > -1) {
      joined = joined.split(' }').join('}')
    }
    while (joined.indexOf('  ') > -1) {
      joined = joined.split('  ').join(' ')
    }
    return parser.tokenizeLine(joined)
  }

  function renderTurns (turns, parent) {
    if (turns === window.pgn.turns) {
      timeline = 1
    }
    for (const turn of turns) {
      let li
      if (turn.turnContainer && 2 === 1) {
        li = turn.turnContainer
        if (li.classList.contains('show-positioning')) {
          toggleEditOptions({ target: li.firstChild })
        }
      } else {
        li = createFromTemplate('#turn-components-template')
      }
      const sequence = li.querySelector('.turn-components')
      renderSequence(turn.sequence, sequence, false)
      if (!li.parentNode) {
        parent.appendChild(li)
        li = turn.turnContainer = parent.lastElementChild
      }
      resetTurnContainerButtons(li)
      if (turn.color === 'w') {
        li.classList.add('white-turn-link')
      } else {
        li.classList.add('black-turn-link')
      }
      const deleteLastTurnButton = li.querySelector('.delete-last-turn-button')
      if (turn === turns[turns.length - 1]) {
        deleteLastTurnButton.onclick = deleteLastTurn
      } else {
        deleteLastTurnButton.style.display = 'none'
      }
      if (!turn.siblings || !turn.siblings.length) {
        continue
      }
      for (const sibling of turn.siblings) {
        timeline++
        let ul = createFromTemplate('#sibling-components-template')
        li.appendChild(ul)
        ul = li.lastElementChild
        ul.classList.add(`timeline${timeline}`)
        timeline = renderTurns(sibling, ul)
      }
    }
    return timeline
  }

  function renderSequence (sequence, container, insideSpacingOnly) {
    container.innerHTML = ''
    const expandedSequence = expandSequence(sequence, !!insideSpacingOnly)
    if (insideSpacingOnly) {
      expandedSequence.pop()
      expandedSequence.shift()
    }
    const renderingAnnotation = container.classList.contains('annotation-components')
    for (const i in expandedSequence) {
      const item = expandedSequence[i]
      const li = document.createElement('li')
      li.title = item
      li.position = i
      const nag = item.startsWith('$')
      const annotation = item.startsWith('{')
      const space = item === ' '
      if (nag || annotation || space || renderingAnnotation) {
        if (renderingAnnotation) {
          if (item !== '{' && item !== '}') {
            li.onmousedown = selectAnnotationSequencePosition
          } else {
            li.style.pointerEvents = 'none'
            li.mouseEnabled = false
          }
        } else {
          li.onmousedown = selectTurnComponentsPosition
        }
      } else {
        li.style.pointerEvents = 'none'
        li.mouseEnabled = false
      }
      container.appendChild(li)
      if (item === ' ') {
        li.className = 'sequence-position-item'
        li.innerHTML = '<button class="button turn-location-button"><i class="fas fa-circle"></i></button>'
        li.firstChild.mouseEnabled = false
        continue
      }
      li.className = 'turn-components-item'
      if (item.length > 30) {
        li.innerHTML = item.substring(0, 20) + '...'
        if (item.charAt(0) === '{') {
          li.innerHTML += '}'
        }
        if (item.charAt(0) === '(') {
          li.innerHTML += ')'
        }
      } else {
        li.innerHTML = item
      }
    }
    return container
  }

  function selectTurnComponentsPosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const positionList = turnContainer.querySelector('.turn-components')
    let editing
    for (const child of positionList.children) {
      if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
      if (child.classList.contains('selected-position')) {
        child.classList.remove('selected-position')
      }
      if (!child.classList.contains('sequence-position-item')) {
        if (child === event.target) {
          if (child.innerHTML === '{' || child.innerHTML === '}') {
            continue
          }
          editing = true
        }
        continue
      }
      if (child.firstChild === event.target || child === event.target) {
        child.classList.add('selected-position')
        child.firstChild.firstChild.classList.remove('fa-circle')
        child.firstChild.firstChild.classList.add('fa-dot-circle')
      } else {
        child.firstChild.firstChild.classList.add('fa-circle')
        child.firstChild.firstChild.classList.remove('fa-dot-circle')
      }
    }
    if (editing) {
      return editTurnComponentsPosition(event)
    }
    const newForm = makeInsertionTypeSelector(turnContainer)
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    turnForms.appendChild(newForm)
  }

  function editTurnComponentsPosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    expandTurnContainer(turnContainer)
    const sequence = turnContainer.querySelector('.turn-components')
    let selectedPosition
    for (const child of sequence.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
        selectedPosition = child
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const existingForm = turnContainer.querySelector('.annotation-form')
    if (existingForm) {
      existingForm.parentNode.appendChild(existingForm)
    }
    const formSelector = turnContainer.querySelector('.insertion-form-selector')
    if (formSelector) {
      formSelector.parentNode.appendChild(formSelector)
    }
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    // editing a nag
    if (selectedPosition.innerHTML.startsWith('$')) {
      const newForm = makeNagForm('#edit-nag-form')
      const nagSelect = newForm.querySelector('.nag-select')
      nagSelect.selectedIndex = parseInt(selectedPosition.innerHTML.substring(1), 10)
      const cancelButton = newForm.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      const formSelector = turnContainer.querySelector('.insertion-form-selector')
      if (formSelector) {
        formSelector.parentNode.appendChild(formSelector)
      }
      turnForms.appendChild(newForm)
      return
    }
    // editing an annotation
    if (selectedPosition.innerHTML.startsWith('{')) {
      const sequence = parser.tokenizeLine(selectedPosition.title)
      const newForm = makeAnnotationEditor(turnContainer, sequence)
      turnForms.appendChild(newForm)
      return setupAnnotationEditor(turnContainer)
    }
  }

  function selectAnnotationSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const positionList = turnContainer.querySelector('.annotation-components')
    let editing
    for (const child of positionList.children) {
      if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
      if (child.classList.contains('selected-position')) {
        child.classList.remove('selected-position')
      }
      if (!child.classList.contains('sequence-position-item')) {
        if (child === event.target) {
          if (child.innerHTML === '{' || child.innerHTML === '}') {
            continue
          }
          editAnnotationSequencePosition(event)
          editing = true
        }
        continue
      }
      if (child.firstChild === event.target || child === event.target) {
        child.classList.add('selected-position')
        child.firstChild.firstChild.classList.remove('fa-circle')
        child.firstChild.firstChild.classList.add('fa-dot-circle')
      } else {
        child.firstChild.firstChild.classList.add('fa-circle')
        child.firstChild.firstChild.classList.remove('fa-dot-circle')
      }
    }
    if (editing) {
      return
    }
    const newForm = makeAnnotationTypeSelector(turnContainer)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    formContainer.appendChild(newForm)
  }

  function editAnnotationSequencePosition (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const components = turnContainer.querySelector('.annotation-components')
    const position = findElementChildIndex(event.target)
    let selectedPosition
    for (const child of components.children) {
      if (child === event.target) {
        child.classList.add('edit-position')
        selectedPosition = child
      } else if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.pop()
    expandedSequence.shift()
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = expandedSequence[position]
    if (selectedPosition.innerHTML.startsWith('[%cal')) {
      const newForm = makeAnnotationArrowForm(turnContainer, '#edit-arrow-annotation-form')
      formContainer.appendChild(newForm)
      let arrowData = selectedPosition.title.substring('[%cal '.length)
      arrowData = arrowData.substring(0, arrowData.indexOf(']'))
      const pendingList = formContainer.querySelector('.pending-list')
      const arrows = arrowData.split(',')
      for (const arrow of arrows) {
        let color
        switch (arrow[0]) {
          case 'R':
            color = 'red'
            break
          case 'G':
            color = 'green'
            break
          case 'Y':
            color = 'yellow'
            break
          case 'B':
            color = 'blue'
            break
        }
        const activeColorButton = formContainer.querySelector(`.${color}-arrow-button`)
        const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
        const column1 = arrow[1]
        const row1 = arrow[2]
        const coordinate1 = `${column1}${row1}`
        const column2 = arrow[3]
        const row2 = arrow[4]
        const coordinate2 = `${column2}${row2}`
        const listItem = document.createElement('li')
        listItem.innerHTML = `<span class="${color}">${colorText} <i>${coordinate1}</i> <i>${coordinate2}</i></span>`
        const chessBoard = formContainer.querySelector('.chessboard')
        const highlightContainer = formContainer.querySelector('.highlight-arrow-container')
        const arrowSVG = drawArrow(coordinate1, coordinate2, chessBoard, highlightContainer)
        arrowSVG.classList.add('chessboard-arrow')
        arrowSVG.classList.add(`${color}-arrow`)
        arrowSVG.style.width = chessBoard.offsetWidth
        arrowSVG.style.height = chessBoard.offsetHeight
        arrowSVG.innerHTML += ''
        const deleteButton = document.createElement('button')
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
        deleteButton.className = 'button annotation-form-button'
        deleteButton.color = color
        deleteButton.arrow = arrowSVG
        deleteButton.onclick = deleteArrow
        listItem.appendChild(deleteButton)
        pendingList.appendChild(listItem)
      }
      const cancelButton = formContainer.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      return
    }
    if (selectedPosition.innerHTML.startsWith('[%csl')) {
      const newForm = makeAnnotationSquareForm(turnContainer, '#edit-square-annotation-form')
      formContainer.appendChild(newForm)
      let squareData = selectedPosition.title.substring('[%cal '.length)
      squareData = squareData.substring(0, squareData.indexOf(']'))
      const pendingList = formContainer.querySelector('.pending-list')
      const squares = squareData.split(',')
      for (const square of squares) {
        let color
        switch (square.charAt(0)) {
          case 'R':
            color = 'red'
            break
          case 'G':
            color = 'green'
            break
          case 'Y':
            color = 'yellow'
            break
          case 'B':
            color = 'blue'
            break
        }
        const activeColorButton = formContainer.querySelector(`.${color}-square-button`)
        const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
        const column = square[1]
        const row = square[2]
        const coordinate = `${column}${row}`
        const cell = formContainer.querySelector(`.coordinate-${column}${row}`)
        cell.classList.add(`${color}-square`)
        const listItem = document.createElement('li')
        listItem.innerHTML = `<span class="${color}">${colorText} <i>${coordinate}</i></span>`
        const deleteButton = document.createElement('button')
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
        deleteButton.className = 'button annotation-form-button'
        deleteButton.square = cell
        deleteButton.color = color
        deleteButton.onclick = deleteSquare
        listItem.appendChild(deleteButton)
        pendingList.appendChild(listItem)
      }
      const cancelButton = formContainer.querySelector('.cancel-button')
      cancelButton.onclick = cancelAndCloseForm
      return
    }
    // a text block
    const newForm = makeAnnotationTextForm(turnContainer, '#edit-text-annotation-form')
    const textarea = newForm.querySelector('.annotation-text')
    textarea.value = editing
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    formContainer.appendChild(newForm)
  }

  function cancelAndCloseForm (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    unexpandTurnContainer(turnContainer)
    unselectTurnComponentsPosition(turnContainer)
  }

  function switchForm (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const formCreator = button.formCreator
    const turnContainer = findTurnContainer(event.target)
    const newForm = formCreator(turnContainer)
    if (button.formContainer) {
      button.formContainer.innerHTML = ''
      return button.formContainer.appendChild(newForm)
    }
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    turnForms.appendChild(newForm)
    if (button.formSetup) {
      button.formSetup(turnContainer)
    }
  }

  function makeInsertionTypeSelector () {
    const template = document.querySelector('#insertion-form-selector')
    const form = document.importNode(template.content, true)
    const nagButton = form.querySelector('.nag-button')
    nagButton.formCreator = makeNagForm
    nagButton.onclick = switchForm
    const annotationButton = form.querySelector('.annotation-button')
    annotationButton.formCreator = makeAnnotationEditor
    annotationButton.formSetup = setupAnnotationEditor
    annotationButton.onclick = switchForm
    const alternativeTurnsButton = form.querySelector('.alternative-moves-button')
    alternativeTurnsButton.formCreator = makeAlternativeTurnsForm
    alternativeTurnsButton.onclick = switchForm
    const quizButton = form.querySelector('.quiz-button')
    quizButton.formCreator = makeQuizForm
    quizButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    return form
  }

  function makeAnnotationEditor (turnContainer, annotationSequence) {
    const form = createFromTemplate('#annotation-editor')
    const turnComponents = turnContainer.querySelector('.turn-components')
    const annotationComponents = form.querySelector('.annotation-components')
    turnContainer.annotationSequence = annotationSequence || ['{}']
    renderSequence(turnContainer.annotationSequence, annotationComponents, true)
    const formContainer = form.querySelector('.annotation-form-container')
    const editing = !!turnComponents.querySelector('.edit-position')
    makeAnnotationOptionSelector(formContainer, editing)
    const cancelButton = formContainer.querySelector('.cancel-button')
    cancelButton.onclick = cancelAndCloseForm
    return form
  }

  function setupAnnotationEditor (turnContainer) {
    const annotationComponents = turnContainer.querySelector('.annotation-components')
    const preselectPosition = annotationComponents.children.length === 5 ? annotationComponents.children[2] : annotationComponents.children[annotationComponents.children.length - 2]
    selectAnnotationSequencePosition({
      target: preselectPosition
    })
  }

  function makeAnnotationOptionSelector (formContainer, editing) {
    const form = createFromTemplate('#annotation-editor-options')
    formContainer.innerHTML = ''
    formContainer.appendChild(form)
    const insertAnnotationButton = formContainer.querySelector('.insert-annotation-button')
    insertAnnotationButton.onclick = addAnnotation
    insertAnnotationButton.style.display = editing ? 'none' : 'inline-block'
    const updateAnnotationButton = formContainer.querySelector('.update-annotation-button')
    updateAnnotationButton.onclick = updateAnnotation
    updateAnnotationButton.style.display = editing ? 'inline-block' : 'none'
    const cancelButton = formContainer.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return form
  }

  function makeAnnotationTypeSelector (turnContainer) {
    const form = createFromTemplate('#annotation-type-selector')
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    const addTextButton = form.querySelector('.add-text-button')
    addTextButton.formCreator = makeAnnotationTextForm
    addTextButton.formContainer = formContainer
    addTextButton.onclick = switchForm
    const addSquareButton = form.querySelector('.add-square-button')
    addSquareButton.formCreator = makeAnnotationSquareForm
    addSquareButton.formContainer = formContainer
    addSquareButton.onclick = switchForm
    const addArrowButton = form.querySelector('.add-arrow-button')
    addArrowButton.formCreator = makeAnnotationArrowForm
    addArrowButton.formContainer = formContainer
    addArrowButton.onclick = switchForm
    const cancelButton = form.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationEditor
    cancelButton.onclick = switchForm
    return form
  }

  function makeNagForm (eventOrTemplate) {
    const template = eventOrTemplate && eventOrTemplate.substring ? eventOrTemplate : '#new-nag-form'
    const newForm = createFromTemplate(template)
    const nagIndex = document.querySelector('#nag-index')
    const nagSelect = newForm.querySelector('.nag-select')
    nagSelect.innerHTML = nagIndex.content.firstElementChild.innerHTML
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    const addNagButton = newForm.querySelector('.add-nag-button')
    if (addNagButton) {
      addNagButton.onclick = addNag
    }
    const updateNagButton = newForm.querySelector('.update-nag-button')
    if (updateNagButton) {
      updateNagButton.onclick = updateNag
    }
    const deleteNagButton = newForm.querySelector('.delete-nag-button')
    if (deleteNagButton) {
      deleteNagButton.onclick = deleteNag
    }
    return newForm
  }

  function makeAlternativeTurnsForm (turnContainer) {
    const turn = findTurn(turnContainer)
    const newForm = createFromTemplate('#new-alternative-moves-form')
    const chessBoard = newForm.querySelector('.chessboard')
    const previousTurnState = {
      pieces: turn.previousPieces
    }
    const hitArea = chessBoard.parentNode.querySelector('.alternative-moves-hitarea')
    hitArea.onmousedown = selectAlternativePiece
    hitArea.onmouseup = turnAlternativePiece
    turnContainer.alternativeTurns = []
    setupMiniChessBoard(chessBoard, hitArea, previousTurnState, true)
    const insertButton = newForm.querySelector('.insert-alternative-moves-button')
    insertButton.onclick = insertAlternativeTurn
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    const pendingList = newForm.querySelector('.pending-list')
    pendingList.style.display = 'none'
    pendingList.querySelector('.cancel-button').onclick = undoLastPendingTurn
    return newForm
  }

  function selectAlternativePiece (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const coordinate = event.target.className.split('-').pop()
    if ('abcdefgh'.indexOf(coordinate[0]) === -1) {
      return
    }
    if ('12345678'.indexOf(coordinate[1]) === -1) {
      return
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    let requiredColor, pieces
    if (turnContainer.alternativeTurns && turnContainer.alternativeTurns.length) {
      requiredColor = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].color === 'w' ? 'b' : 'w'
      pieces = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].pieces
    } else {
      requiredColor = turn.color === 'w' ? 'w' : 'b'
      pieces = turn.previousPieces
    }
    let selectedPiece
    for (const piece of pieces) {
      if (piece.coordinate === coordinate) {
        selectedPiece = piece
        break
      }
    }
    if (!selectedPiece || selectedPiece.color !== requiredColor) {
      delete (turnContainer.selectedPiece)
      return
    }
    turnContainer.selectedPiece = selectedPiece
  }

  function turnAlternativePiece (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer.selectedPiece) {
      return
    }
    const coordinate = event.target.className.split('-').pop()
    if ('abcdefgh'.indexOf(coordinate[0]) === -1) {
      return
    }
    if ('12345678'.indexOf(coordinate[1]) === -1) {
      return
    }
    const turn = findTurn(turnContainer)
    let pieces, moveNumber, dots, color
    if (turnContainer.alternativeTurns.length) {
      pieces = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].pieces
      moveNumber = nextTurnNumber(turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1])
      dots = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].color === 'w' ? '...' : '.'
      color = turnContainer.alternativeTurns[turnContainer.alternativeTurns.length - 1].color === 'w' ? 'b' : 'w'
    } else {
      pieces = turn.previousPieces
      moveNumber = turn.moveNumber
      dots = turn.color === 'w' ? '.' : '...'
      color = turn.color === 'w' ? 'w' : 'b'
    }
    const alternativeTurn = {
      color,
      moveNumber,
      to: coordinate,
      from: turnContainer.selectedPiece.coordinate,
      pieces: JSON.parse(JSON.stringify(pieces)),
      previousPieces: JSON.parse(JSON.stringify(pieces)),
      piece: turnContainer.selectedPiece
    }
    const turnment = parser.calculatePieceMovement(alternativeTurn.piece, alternativeTurn, alternativeTurn.pieces)
    if (!turnment) {
      return
    }
    for (const piece of alternativeTurn.pieces) {
      if (piece.type === alternativeTurn.piece.type && piece.coordinate === alternativeTurn.piece.coordinate) {
        piece.coordinate = coordinate
        break
      }
    }
    turnContainer.alternativeTurns.push(alternativeTurn)
    // todo:
    // 1) captured pieces do not process
    // 2) promoted pieces do not process
    // 4) cannot add alternative turns to new alternative turns
    // 5) inserted text is excesssively specific (1. Pee4 vs 1. e2 with type and column inferred)
    // 7) cannot "edit" existing alternative turns ie delete last or add next turn
    const chessBoard = turnContainer.querySelector('.alternative-moves-chessboard')
    const cellBefore = chessBoard.querySelector(`.coordinate-${turnContainer.selectedPiece.coordinate}`)
    const cellAfter = chessBoard.querySelector(`.coordinate-${coordinate}`)
    cellAfter.style.backgroundImage = cellBefore.style.backgroundImage
    cellBefore.style.backgroundImage = ''
    const pendingList = turnContainer.querySelector('.pending-turn-list')
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span>${moveNumber}${dots} ${alternativeTurn.piece.type} <i>${alternativeTurn.piece.coordinate}</i> to <i>${coordinate}</i></span>`
    pendingList.insertBefore(listItem, pendingList.lastElementChild)
    pendingList.style.display = ''
  }

  function undoLastPendingTurn (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const lastTurn = turnContainer.alternativeTurns.pop()
    const chessBoard = turnContainer.querySelector('.alternative-moves-chessboard')
    const cellBefore = chessBoard.querySelector(`.coordinate-${lastTurn.to}`)
    const cellAfter = chessBoard.querySelector(`.coordinate-${lastTurn.from}`)
    cellAfter.style.backgroundImage = cellBefore.style.backgroundImage
    cellBefore.style.backgroundImage = ''

    const pendingList = turnContainer.querySelector('.pending-turn-list')
    pendingList.appendChild(pendingList.children[pendingList.children.length - 2])
    if (pendingList.children.length === 1) {
      pendingList.style.display = 'none'
    }
  }

  function nextTurnNumber (previousTurn) {
    const previousNumber = parseInt(previousTurn.moveNumber, 10)
    if (previousTurn.color === 'w') {
      return previousNumber
    }
    return previousNumber + 1
  }

  function insertAlternativeTurn (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const pendingList = turnContainer.querySelector('.pending-turn-list')
    const annotationParts = []
    for (const child of pendingList.children) {
      if (child.firstElementChild.tagName === 'BUTTON') {
        continue
      }
      let moveNumber = child.innerHTML.substring('<span>'.length)
      moveNumber = moveNumber.substring(0, moveNumber.indexOf(' '))
      let coordinate = child.innerHTML.substring(child.innerHTML.lastIndexOf('<i>') + 3)
      coordinate = coordinate.substring(0, coordinate.indexOf('<'))
      let coordinateBefore = child.innerHTML.substring(child.innerHTML.indexOf('<i>') + 3)
      coordinateBefore = coordinateBefore[0]
      let piece = child.innerHTML.substring(child.innerHTML.indexOf(' ') + 1)
      piece = piece[0]
      // TODO: this is a very verbose "1.Kde4" structure, it should be
      // possible to calculate the smallest unambiguous expression
      annotationParts.push(`${moveNumber}${piece}${coordinateBefore}${coordinate}`)
    }
    const annotationText = `(${annotationParts.join(' ')})`
    const pieces = JSON.parse(JSON.stringify(turn.previousPieces))
    const sibling = parser.parseTurn(annotationText.substring(1, annotationText.length - 1))
    for (const child of sibling) {
      child.parentTurn = turn
      parser.processTurn(child, sibling, pieces)
    }
    const selectedPosition = turnContainer.querySelector('.selected-position')
    const expandedSequence = expandSequence(turn.sequence)
    const position = selectedPosition.position
    expandedSequence.splice(position, 0, ' ', annotationText)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
    const turnComponents = turnContainer.querySelector('.turn-components')
    renderSequence(turn.sequence, turnComponents)
    resetTurnContainerButtons(turnContainer)
    const turnForms = turnContainer.querySelector('.turn-forms')
    turnForms.innerHTML = ''
    unselectTurnComponentsPosition(turnContainer)
    unexpandTurnContainer(turnContainer)
    timeline++
    let ul = createFromTemplate('#sibling-components-template')
    turnContainer.appendChild(ul)
    ul = turnContainer.lastElementChild
    ul.className = `turn-list timeline${timeline}`
    turn.siblings = turn.siblings || []
    turn.siblings.push(sibling)
    renderTurns(sibling, ul)
  }

  function makeQuizForm () {
    const newForm = createFromTemplate('#new-quiz-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeInsertionTypeSelector
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationTextForm (turnContainer, template) {
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    const newForm = createFromTemplate(template || '#new-text-annotation-form')
    const insertTextButton = newForm.querySelector('.insert-text-button')
    if (insertTextButton) {
      insertTextButton.onclick = insertAnnotationText
    }
    const updateButton = newForm.querySelector('.update-text-button')
    if (updateButton) {
      updateButton.onclick = updateAnnotationText
    }
    const deleteButton = newForm.querySelector('.delete-text-button')
    if (deleteButton) {
      deleteButton.onclick = deleteAnnotationText
    }
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    return newForm
  }

  function makeAnnotationSquareForm (turnContainer, templateid) {
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    const newForm = createFromTemplate(templateid || '#new-square-annotation-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    if (templateid) {
      const updateButton = newForm.querySelector('.update-squares-text-button')
      updateButton.onclick = updateSquareText
    } else {
      const insertButton = newForm.querySelector('.insert-squares-text-button')
      insertButton.onclick = insertSquareText
    }
    const colors = newForm.querySelectorAll('.square-color')
    for (const color of colors) {
      color.onclick = selectColor
    }
    const manualAddButton = newForm.querySelector('.highlight-square-button')
    manualAddButton.onclick = manuallyAddSquare
    const resetButton = newForm.querySelector('.reset-squares-button')
    resetButton.onclick = (event) => {
      if (event && event.preventDefault) {
        event.preventDefault()
      }
      const chessBoard = (event ? findTurnContainer(event.target) : newForm).querySelector('.chessboard')
      chessBoard.onclick = clickHighlightSquareCell
      chessBoard.innerHTML = ''
      const turnContainerFromButton = event ? findTurnContainer(event.target) : turnContainer
      const turn = findTurn(turnContainerFromButton)
      setupMiniChessBoard(chessBoard, null, turn)
      const pendingList = (event ? findTurnContainer(event.target) : newForm).querySelector('.pending-list')
      pendingList.innerHTML = ''
    }
    resetButton.onclick()
    return newForm
  }

  function manuallyAddSquare (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const chessboard = turnContainer.querySelector('.annotate-square-chessboard')
    const column = document.querySelector('.select-column')
    const row = document.querySelector('.select-row')
    const coordinate = column.value + row.value
    column.selectedIndex = 0
    row.selectedIndex = 0
    return clickHighlightSquareCell({
      target: chessboard.querySelector(`.coordinate-${coordinate}`)
    })
  }

  function makeAnnotationArrowForm (turnContainer, templateid) {
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    const newForm = createFromTemplate(templateid || '#new-arrow-annotation-form')
    const cancelButton = newForm.querySelector('.cancel-button')
    cancelButton.formCreator = makeAnnotationTypeSelector
    cancelButton.formContainer = formContainer
    cancelButton.onclick = switchForm
    if (templateid) {
      const updateButton = newForm.querySelector('.update-arrows-text-button')
      updateButton.onclick = updateArrowText
    } else {
      const insertButton = newForm.querySelector('.insert-arrows-text-button')
      insertButton.onclick = insertArrowText
    }
    const colors = newForm.querySelectorAll('.arrow-color')
    for (const color of colors) {
      color.onclick = selectColor
    }
    const manualAddButton = newForm.querySelector('.highlight-arrow-button')
    manualAddButton.onclick = manuallyAddArrow
    const resetButton = newForm.querySelector('.reset-arrows-button')
    resetButton.onclick = (event) => {
      if (event && event.preventDefault) {
        event.preventDefault()
      }
      const chessBoard = (event ? findTurnContainer(event.target) : newForm).querySelector('.chessboard')
      chessBoard.innerHTML = ''
      const hitArea = chessBoard.parentNode.querySelector('.annotate-arrow-hitarea')
      hitArea.innerHTML = ''
      const turnContainerFromButton = event ? findTurnContainer(event.target) : turnContainer
      const turn = findTurn(turnContainerFromButton)
      setupMiniChessBoard(chessBoard, hitArea, turn)
      const pendingList = (event ? findTurnContainer(event.target) : newForm).querySelector('.pending-list')
      pendingList.innerHTML = ''
    }
    resetButton.onclick()
    return newForm
  }

  function manuallyAddArrow (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const chessboard = turnContainer.querySelector('.annotate-arrow-chessboard')
    const column1 = document.querySelector('.select-column-start')
    const row1 = document.querySelector('.select-row-start')
    const coordinate1 = column1.value + row1.value
    column1.selectedIndex = 0
    row1.selectedIndex = 0
    startHighlightArrow({
      target: chessboard.querySelector(`.coordinate-${coordinate1}`)
    })
    const column2 = document.querySelector('.select-column-end')
    const row2 = document.querySelector('.select-row-end')
    const coordinate2 = column2.value + row2.value
    column2.selectedIndex = 0
    row2.selectedIndex = 0
    stopHighlightArrow({
      target: chessboard.querySelector(`.coordinate-${coordinate2}`)
    })
  }

  function createFromTemplate (templateid) {
    const template = document.querySelector(templateid)
    const newForm = document.importNode(template.content, true)
    return newForm
  }

  function startHighlightArrow (event) {
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    const previewContainer = turnContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    let arrowStartingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowStartingCoordinate = className.split('-')[1]
    }
    turnContainer.startingCoordinate = arrowStartingCoordinate
  }

  function stopHighlightArrow (event) {
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    const previewContainer = turnContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (!turnContainer.startingCoordinate) {
      return
    }
    const arrowStartingCoordinate = turnContainer.startingCoordinate
    let arrowEndingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowEndingCoordinate = className.split('-')[1]
    }
    delete (turnContainer.startingCoordinate)
    if (event.target.tagName !== 'TD' && (!event.target.parentNode || event.target.parentNode.tagName !== 'TD')) {
      return
    }
    const chessboard = turnContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color, activeColorButton
    const colorButtons = turnContainer.querySelectorAll('.arrow-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      activeColorButton = colorButton
      color = colors[i]
      break
    }
    const highlightContainer = turnContainer.querySelector('.highlight-arrow-container')
    const arrow = drawArrow(arrowStartingCoordinate, arrowEndingCoordinate, chessboard, highlightContainer)
    if (!arrow) {
      return
    }
    arrow.classList.add('chessboard-arrow')
    arrow.classList.add(`${color}-arrow`)
    arrow.style.width = chessboard.offsetWidth
    arrow.style.height = chessboard.offsetHeight
    arrow.innerHTML += ''
    const pendingList = turnContainer.querySelector('.pending-arrow-list')
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span>${activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)} <i>${arrowStartingCoordinate}</i> to <i>${arrowEndingCoordinate}</i></span>`
    const deleteButton = document.createElement('button')
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.className = 'button annotation-form-button'
    deleteButton.arrow = arrow
    deleteButton.onclick = deleteArrow
    listItem.appendChild(deleteButton)
    pendingList.appendChild(listItem)
  }

  function deleteArrow (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const listItem = button.parentNode
    const list = listItem.parentNode
    list.removeChild(listItem)
    const arrow = event.target.arrow
    arrow.parentNode.removeChild(arrow)
  }

  function previewHighlightArrow (event) {
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    const previewContainer = turnContainer.querySelector('.preview-arrow-container')
    if (!previewContainer) {
      return
    }
    previewContainer.innerHTML = ''
    if (!turnContainer.startingCoordinate) {
      return
    }
    const arrowStartingCoordinate = turnContainer.startingCoordinate
    let arrowEndingCoordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      arrowEndingCoordinate = className.split('-')[1]
    }
    if (event.target.tagName !== 'TD' && (!event.target.parentNode || event.target.parentNode.tagName !== 'TD')) {
      return
    }
    const chessboard = turnContainer.querySelector('.annotate-arrow-chessboard')
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color
    const colorButtons = turnContainer.querySelectorAll('.arrow-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      color = colors[i]
      break
    }
    const arrow = drawArrow(arrowStartingCoordinate, arrowEndingCoordinate, chessboard, previewContainer)
    if (!arrow) {
      return
    }
    arrow.classList.add('chessboard-arrow')
    arrow.classList.add(`${color}-arrow`)
    arrow.style.width = chessboard.offsetWidth
    arrow.style.height = chessboard.offsetHeight
    arrow.innerHTML += ''
  }

  function clickHighlightSquareCell (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    if (!turnContainer) {
      return
    }
    if (event.target.tagName !== 'TD' && event.target.parentNode.tagName !== 'TD') {
      return
    }
    const colors = ['red', 'green', 'blue', 'yellow']
    let i = -1
    let color, activeColorButton
    const colorButtons = turnContainer.querySelectorAll('.square-color')
    for (const colorButton of colorButtons) {
      i++
      if (!colorButton.firstChild.classList.contains('fa-dot-circle')) {
        continue
      }
      color = colors[i]
      activeColorButton = colorButton
      break
    }
    let coordinate
    for (const className of event.target.classList) {
      if (!className.startsWith('coordinate-')) {
        continue
      }
      coordinate = className.split('-')[1]
      break
    }
    const pendingList = turnContainer.querySelector('.pending-square-list')
    const cell = event.target.tagName === 'TD' ? event.target : event.target.parentNode
    const colorText = activeColorButton.innerHTML.substring(activeColorButton.innerHTML.indexOf('</i>') + 4)
    for (const colorid of colors) {
      if (cell.classList.contains(`${colorid}-square`)) {
        cell.classList.remove(`${colorid}-square`)
        for (const child of pendingList.children) {
          if (child.innerHTML.indexOf(colorid) === -1 || child.innerHTML.indexOf(coordinate) === -1) {
            continue
          }
          pendingList.appendChild(child)
        }
        if (colorid === color) {
          return
        }
      }
    }
    cell.classList.add(`${color}-square`)
    const listItem = document.createElement('li')
    listItem.innerHTML = `<span class="${color}">${colorText} <i>${coordinate}</i></span>`
    const deleteButton = document.createElement('button')
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete'
    deleteButton.className = 'button annotation-form-button'
    deleteButton.square = cell
    deleteButton.color = color
    deleteButton.onclick = deleteSquare
    listItem.appendChild(deleteButton)
    pendingList.appendChild(listItem)
  }

  function deleteSquare (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const button = event.target
    const listItem = button.parentNode
    const list = listItem.parentNode
    list.removeChild(listItem)
    const square = event.target.square
    square.classList.remove(`${event.target.color}-square`)
  }

  function selectColor (event) {
    event.preventDefault()
    const buttonList = event.target.parentNode
    for (const button of buttonList.children) {
      if (event.target === button) {
        button.firstChild.classList.remove('fa-circle')
        button.firstChild.classList.add('fa-dot-circle')
      } else if (button.firstChild.classList.contains('fa-dot-circle')) {
        button.firstChild.classList.add('fa-circle')
        button.firstChild.classList.remove('fa-dot-circle')
      }
    }
  }

  function toggleEditOptions (event) {
    const turnContainer = findTurnContainer(event.target)
    if (turnContainer.classList.contains('show-positioning')) {
      unexpandTurnContainer(turnContainer)
      unselectTurnComponentsPosition(turnContainer)
      const turnForms = turnContainer.querySelector('.turn-forms')
      turnForms.innerHTML = ''
    } else {
      return expandTurnContainer(turnContainer)
    }
  }

  /**
   * adds annotation to the turn sequence
   * @param {} event
   * @returns
   */
  function addAnnotation (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    let annotation = turnContainer.annotationSequence.join(' ')
    const selectedPosition = turnContainer.querySelector('.selected-position')
    if (!selectedPosition) {
      return
    }
    const position = findElementChildIndex(selectedPosition)
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    if (expandedSequence.indexOf('{') > -1 && expandedSequence.indexOf('{') < position - 1 && expandedSequence.indexOf('}') > position - 1) {
      annotation = annotation.slice(1, annotation.length - 1)
    }
    expandedSequence.splice(position, 0, ' ', annotation)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function updateAnnotation (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const annotation = turnContainer.annotationSequence.join(' ')
    const editPosition = turnContainer.querySelector('.edit-position')
    if (!editPosition) {
      return
    }
    const position = findElementChildIndex(editPosition)
    const expandedSequence = expandSequence(turn.sequence)
    expandedSequence[position - 1] = annotation
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function deleteAnnotation (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
  }

  function deleteLastTurn (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const deletingTurn = findTurn(turnContainer)
    if (!deletingTurn.parentTurn) {
      window.pgn.turns.splice(window.pgn.turns.indexOf(deletingTurn), 1)
    } else {
      for (const i in deletingTurn.parentTurn.siblings) {
        const index = deletingTurn.parentTurn.siblings[i].indexOf(deletingTurn)
        if (index === -1) {
          continue
        }
        // remove the turn from the sibling
        deletingTurn.parentTurn.siblings[i].splice(index, 1)
        break
      }
      // update the parent sequence
      const newSequence = [].concat(deletingTurn.parentTurn.sequence)
      let siblingNumber = 0
      for (const j in newSequence) {
        if (!newSequence[j].startsWith('(')) {
          continue
        }
        newSequence[j] = recombineNestedMoves(deletingTurn.parentTurn.siblings[siblingNumber])
        siblingNumber++
      }
      proliferateChanges(deletingTurn.parentTurn, newSequence)
      
    }
    turnContainer.parentNode.removeChild(turnContainer)
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }


  function recombineNestedMoves (turnArray) {
    if (!turnArray.length) {
      return ''
    }
    const pgnParts = []
    for (const turn of turnArray) {
      pgnParts.push(turn.sequence.join(' '))
    }
    return '(' + parser.cleanSpacing(pgnParts.join(' ')) + ')'
  }

  /**
   * adds a nag to the turn sequence
   * @param {} event
   * @returns
   */
  function addNag (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const nag = turnContainer.querySelector('.nag-select').value
    const turnComponents = turnContainer.querySelector('.turn-components')
    const selectedPosition = turnComponents.querySelector('.selected-position')
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    const position = selectedPosition.position
    expandedSequence.splice(position, 0, ' ', nag)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function updateNag (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const selectedPosition = turnComponents.querySelector('.edit-position')
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    const newNag = turnContainer.querySelector('.nag-select').value
    expandedSequence[parseInt(selectedPosition.position, 10)] = newNag
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function deleteNag (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const selectedPosition = turnComponents.querySelector('.edit-position')
    const turn = findTurn(turnContainer)
    const expandedSequence = expandSequence(turn.sequence)
    expandedSequence.splice(parseInt(selectedPosition.position, 10), 1)
    proliferateChanges(turn, contractExpandedSequence(expandedSequence))
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  /**
   * adds text to the annotation block
   * @param {} event
   * @returns
   */
  function insertAnnotationText (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.selected-position')
    turnContainer.annotationSequence = turnContainer.annotationSequence || ['{', '}']
    const textArea = turnContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    textArea.value = ''
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 0, ' ', annotationText)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = !!turnContainer.querySelector('.edit-position')
    return makeAnnotationOptionSelector(formContainer, editing)
  }

  function updateAnnotationText (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const textArea = turnContainer.querySelector('.annotation-text')
    const annotationText = textArea.value
    textArea.value = ''
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    const position = findElementChildIndex(annotationPosition)
    expandedSequence[position + 1] = annotationText
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteAnnotationText (event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 1)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const turnPosition = turnComponents.querySelector('.edit-position')
    const expandedTurnComponents = expandSequence(turn.sequence)
    if (turnContainer.annotationSequence.length === 1 && turnContainer.annotationSequence[0] === '{}') {
      expandedTurnComponents.splice(turnPosition.position, 1)
      proliferateChanges(turn, contractExpandedSequence(expandedTurnComponents))
    }
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  /**
   * adds [% csl] to the annotation block
   * @param {*} event
   * @returns
   */
  function insertSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const squareChessBoard = turnContainer.querySelector('.annotate-square-chessboard')
    for (const row of squareChessBoard.rows) {
      for (const cell of row.cells) {
        let coordinate
        for (const className of cell.classList) {
          if (!className.startsWith('coordinate-')) {
            continue
          }
          coordinate = className.split('-')[1]
          break
        }
        if (cell.classList.contains('red-square')) {
          colors.red.push(`R${coordinate}`)
        } else if (cell.classList.contains('blue-square')) {
          colors.blue.push(`B${coordinate}`)
        } else if (cell.classList.contains('green-square')) {
          colors.green.push(`G${coordinate}`)
        } else if (cell.classList.contains('yellow-square')) {
          colors.yellow.push(`Y${coordinate}`)
        }
      }
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (annotationParts.length) {
      const annotationText = `[%csl ${annotationParts.join(',')}]`
      const annotationSequence = turnContainer.querySelector('.annotation-components')
      const annotationPosition = annotationSequence.querySelector('.selected-position')
      const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
      expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 0, annotationText)
      turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
      renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    }
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = !!turnContainer.querySelector('.edit-position')
    return makeAnnotationOptionSelector(formContainer, editing)
  }

  function updateSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const squareChessBoard = turnContainer.querySelector('.annotate-square-chessboard')
    for (const row of squareChessBoard.rows) {
      for (const cell of row.cells) {
        let coordinate
        for (const className of cell.classList) {
          if (!className.startsWith('coordinate-')) {
            continue
          }
          coordinate = className.split('-')[1]
          break
        }
        if (cell.classList.contains('red-square')) {
          colors.red.push(`R${coordinate}`)
        } else if (cell.classList.contains('blue-square')) {
          colors.blue.push(`B${coordinate}`)
        } else if (cell.classList.contains('green-square')) {
          colors.green.push(`G${coordinate}`)
        } else if (cell.classList.contains('yellow-square')) {
          colors.yellow.push(`Y${coordinate}`)
        }
      }
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (!annotationParts.length) {
      return deleteSquareText(event)
    }
    const annotationText = `[%csl ${annotationParts.join(',')}]`
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence[parseInt(annotationPosition.position, 10) + 1] = annotationText
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteSquareText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 1)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const turnPosition = turnComponents.querySelector('.edit-position')
    const expandedTurnComponents = expandSequence(turn.sequence)
    if (turnContainer.annotationSequence.length === 1 && turnContainer.annotationSequence[0] === '{}') {
      expandedTurnComponents.splice(turnPosition.position, 1)
      proliferateChanges(turn, contractExpandedSequence(expandedTurnComponents))
    }
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function proliferateChanges (turn, newSequence) {
    const oldPGNText = parser.cleanSpacing(turn.sequence.join(' '))
    const newPGNText = parser.cleanSpacing(newSequence.join(' '))
    let t = turn
    t.sequence = newSequence
    while (t.parentTurn) {
      t = t.parentTurn
      for (const i in t.sequence) {
        if (t.sequence[i] === oldPGNText) {
          t.sequence[i] = oldPGNText
        } else if (t.sequence[i].indexOf(oldPGNText) > -1) {
          t.sequence[i] = t.sequence[i].replace(oldPGNText, newPGNText)
        }
      }
    }
  }

  /**
   * adds [%cal] to the annotation
   * @param {} event
   * @returns
   */
  function insertArrowText (event) {
    event.preventDefault()
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const pendingList = turnContainer.querySelector('.pending-arrow-list')
    for (const child of pendingList.children) {
      const span = child.firstChild
      let color = span.innerHTML.trim()
      color = color.substring(0, color.indexOf(' ')).toLowerCase()
      const coordinates = span.querySelectorAll('i')
      colors[color].push(color[0].toUpperCase() + coordinates[0].innerHTML + coordinates[1].innerHTML)
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (annotationParts.length) {
      const annotationText = `[%cal ${annotationParts.join(',')}]`
      const annotationSequence = turnContainer.querySelector('.annotation-components')
      const annotationPosition = annotationSequence.querySelector('.selected-position')
      const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
      expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 0, ' ', annotationText)
      turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
      renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    }
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    const editing = !!turnContainer.querySelector('.edit-position')
    return makeAnnotationOptionSelector(formContainer, editing)
  }

  function updateArrowText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const colors = {
      red: [],
      green: [],
      blue: [],
      yellow: []
    }
    const pendingList = turnContainer.querySelector('.pending-arrow-list')
    for (const child of pendingList.children) {
      const span = child.firstChild
      let color = span.innerHTML.trim()
      color = color.substring(0, color.indexOf(' ')).toLowerCase()
      const coordinates = span.querySelectorAll('i')
      colors[color].push(color[0].toUpperCase() + coordinates[0].innerHTML + coordinates[1].innerHTML)
    }
    let annotationParts = []
    for (const color in colors) {
      if (!colors[color].length) {
        continue
      }
      annotationParts = annotationParts.concat(colors[color])
    }
    if (!annotationParts.length) {
      return deleteArrowText(event)
    }
    const annotationText = `[%cal ${annotationParts.join(',')}]`
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence[parseInt(annotationPosition.position, 10) + 1] = annotationText
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    renderSequence(turnContainer.annotationSequence, annotationSequence, true)
    const formContainer = turnContainer.querySelector('.annotation-form-container')
    formContainer.innerHTML = ''
    return makeAnnotationOptionSelector(formContainer, true)
  }

  function deleteArrowText (event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const turnContainer = findTurnContainer(event.target)
    const turn = findTurn(turnContainer)
    const turnComponents = turnContainer.querySelector('.turn-components')
    const annotationSequence = turnContainer.querySelector('.annotation-components')
    const annotationPosition = annotationSequence.querySelector('.edit-position')
    const expandedSequence = expandSequence(turnContainer.annotationSequence, true)
    expandedSequence.splice(parseInt(annotationPosition.position, 10) + 1, 1)
    turnContainer.annotationSequence = contractExpandedSequence(expandedSequence)
    const expandedTurnComponents = expandSequence(turn.sequence)
    const turnPosition = turnComponents.querySelector('.edit-position')
    if (turnContainer.annotationSequence.length === 1 && turnContainer.annotationSequence[0] === '{}') {
      expandedTurnComponents.splice(turnPosition.position, 1)
      proliferateChanges(turn, contractExpandedSequence(expandedTurnComponents))
    }
    turnList.innerHTML = ''
    renderTurns(window.pgn.turns, turnList)
  }

  function drawArrow (firstCoordinate, lastCoordinate, chessboard, container) {
    if (!firstCoordinate || !lastCoordinate || !chessboard) {
      return
    }
    const previousValues = {}
    const turnSteps = [firstCoordinate, lastCoordinate]
    const sixteenthCellSize = chessboard.offsetWidth / 8 / 8 / 2
    const eighthCellSize = sixteenthCellSize * 2
    const quarterCellSize = eighthCellSize * 2
    const halfCellSize = quarterCellSize * 2
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const markerWidth = eighthCellSize
    const markerHeight = eighthCellSize
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.id = `arrow-highlight-${firstCoordinate}-${lastCoordinate}`
    marker.setAttributeNS(null, 'markerWidth', markerWidth)
    marker.setAttributeNS(null, 'markerHeight', markerHeight)
    marker.setAttributeNS(null, 'refX', markerWidth * 0.8)
    marker.setAttributeNS(null, 'refY', markerHeight / 2)
    marker.setAttributeNS(null, 'orient', 'auto')
    defs.appendChild(marker)
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttributeNS(null, 'points', `0,0 ${markerWidth},${markerHeight / 2} 0,${markerHeight}`)
    polygon.style.strokeWidth = 0
    marker.appendChild(polygon)
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    if (container) {
      container.appendChild(svg)
      svg = container.lastChild
    } else {
      chessboard.parentNode.insertBefore(svg, chessboard.parentNode.children[1])
      svg = chessboard.parentNode.children[chessboard.parentNode.children.length - 2]
    }
    svg.style.strokeWidth = (sixteenthCellSize * 1.5) + 'px'
    svg.appendChild(defs)
    for (const i in turnSteps) {
      const stepCoordinate = turnSteps[i]
      const cell = chessboard.querySelector(`.coordinate-${stepCoordinate}`)
      if (stepCoordinate === firstCoordinate) {
        const xPosition = cell.offsetLeft + halfCellSize
        const yPosition = cell.offsetTop + halfCellSize
        previousValues.xPosition = xPosition
        previousValues.yPosition = yPosition
        continue
      }
      const xPosition = cell.offsetLeft + halfCellSize
      const yPosition = cell.offsetTop + halfCellSize
      const line = document.createElement('line')
      if (stepCoordinate === lastCoordinate) {
        line.setAttributeNS(null, 'marker-end', `url(#arrow-highlight-${firstCoordinate}-${lastCoordinate})`)
      }
      line.setAttributeNS(null, 'x1', previousValues.xPosition)
      line.setAttributeNS(null, 'y1', previousValues.yPosition)
      line.setAttributeNS(null, 'x2', xPosition)
      line.setAttributeNS(null, 'y2', yPosition)
      svg.appendChild(line)
      previousValues.xPosition = xPosition
      previousValues.yPosition = yPosition
    }
    return svg
  }

  function setupMiniChessBoard (table, hitarea, turn) {
    const rows = '87654321'.split('')
    const columns = 'abcdefgh'.split('')
    let white = false
    for (const r of rows) {
      const row = table.insertRow(table.rows.length)
      let clickableRow
      if (hitarea) {
        clickableRow = hitarea.insertRow(hitarea.rows.length)
      }
      white = !white
      for (const c of columns) {
        const cell = row.insertCell(row.cells.length)
        cell.className = `coordinate-${c}${r} chessboard-square ` + (white ? 'white-square' : 'black-square')
        cell.coordinate = `${c}${r}`
        cell.style.backgroundSize = 'cover'
        white = !white
        if (r === '1') {
          cell.innerHTML = '<sub>' + c + '</sub>'
        }
        if (c === 'a') {
          cell.innerHTML += '<sup>' + r + '</sup>'
        }
        cell.style.width = '12%'
        cell.style.height = '12%'
        if (!turn) {
          continue
        }
        for (const piece of turn.pieces) {
          if (piece.coordinate !== `${c}${r}`) {
            continue
          }
          const color = piece.color === 'w' ? 'o' : 'b'
          cell.style.backgroundImage = `url(themes/${window.themeName}/${color}${piece.type}.png)`
        }
        if (!hitarea) {
          continue
        }
        const clickableCell = clickableRow.insertCell(clickableRow.cells.length)
        clickableCell.style.width = '12%'
        clickableCell.style.height = '12%'
        clickableCell.coordinate = `${c}${r}`
        clickableCell.className = `coordinate-${c}${r}`
      }
    }
  }

  function expandTurnContainer (turnContainer) {
    turnContainer.classList.add('show-positioning')
    const circle = turnContainer.querySelector('.fa-edit')
    if (circle) {
      circle.classList.add('fa-minus-circle')
      circle.classList.remove('fa-edit')
    }
  }

  function unexpandTurnContainer (turnContainer) {
    turnContainer.classList.remove('show-positioning')
    const circle = turnContainer.querySelector('.fa-minus-circle')
    if (circle) {
      circle.classList.remove('fa-minus-circle')
      circle.classList.add('fa-edit')
    }
  }

  function unselectTurnComponentsPosition (turnContainer) {
    turnContainer.classList.remove('show-positioning')
    const list = turnContainer.querySelector('.turn-components')
    for (const child of list.children) {
      if (child.classList.contains('selected-position')) {
        child.classList.remove('selected-position')
        child.firstChild.firstChild.classList.add('fa-circle')
        child.firstChild.firstChild.classList.remove('fa-dot-circle')
      }
      if (child.classList.contains('edit-position')) {
        child.classList.remove('edit-position')
      }
    }
  }

  function resetTurnContainerButtons (turnContainer) {
    const toggleInsertionSpacesButton = document.createElement('button')
    toggleInsertionSpacesButton.className = 'button turn-option-button'
    toggleInsertionSpacesButton.innerHTML = '<i class="fas fa-edit"></i>'
    toggleInsertionSpacesButton.annotateForm = 'annotation'
    toggleInsertionSpacesButton.onclick = toggleEditOptions
    const showSpacing = document.createElement('li')
    showSpacing.className = 'turn-options-item'
    showSpacing.appendChild(toggleInsertionSpacesButton)
    const sequence = turnContainer.querySelector('.turn-components')
    sequence.insertBefore(showSpacing, sequence.firstChild)
  }

  function findTurnContainer (element) {
    let turnContainer = element.parentNode
    while (turnContainer && turnContainer.classList && !turnContainer.classList.contains('turn-list-item')) {
      turnContainer = turnContainer.parentNode
    }
    return turnContainer
  }

  function findTurn (turnContainer, turns) {
    turns = turns || window.pgn.turns
    for (const turn of turns) {
      if (turn.turnContainer === turnContainer) {
        return turn
      }
      if (!turn.siblings || !turn.siblings.length) {
        continue
      }
      for (const sibling of turn.siblings) {
        const nestedTurn = findTurn(turnContainer, sibling)
        if (nestedTurn) {
          return nestedTurn
        }
      }
    }
  }

  function findElementChildIndex (selectedPosition) {
    if (!selectedPosition) {
      return -1
    }
    for (const i in selectedPosition.parentNode.children) {
      if (selectedPosition.parentNode.children[i] === selectedPosition) {
        return parseInt(i, 10)
      }
    }
    return -1
  }
})(typeof exports === 'undefined' ? this.annotations = {} : exports)




let allPieces, cellIndex, pieceImages, pieceContainer, chessboardContainer, chessboardCells, chessboard, arrowContainer
let headerContainer
let cellSize, halfCellSize, quarterCellSize, eighthCellSize

window.setupChessBoard = (chessboardTable) => {
  chessboard = chessboardTable || document.querySelector('.chessboard')
  chessboardContainer = chessboard.parentNode
  allPieces = JSON.parse(window.defaultPieces)
  pieceContainer = document.createElement('div')
  pieceContainer.className = 'chessboard-pieces'
  chessboardContainer.appendChild(pieceContainer)
  headerContainer = document.querySelector('.header-container')
  arrowContainer = document.querySelector('.chessboard-arrows')
  // draw chessboard
  if (!cellIndex) {
    cellIndex = {}
    chessboardCells = []
    const rows = '87654321'.split('')
    const columns = 'abcdefgh'.split('')
    let white = false
    for (const r of rows) {
      const row = chessboard.insertRow(chessboard.rows.length)
      white = !white
      for (const c of columns) {
        const cell = row.insertCell(row.cells.length)
        cell.id = `${c}${r}`
        cell.className = cell.originalClassName = 'chessboard-square ' + (white ? 'white-square' : 'black-square')
        white = !white
        if (r === '1') {
          cell.innerHTML = '<sub>' + c + '</sub>'
        }
        if (c === 'a') {
          cell.innerHTML += '<sup>' + r + '</sup>'
        }
        cellIndex[cell.id] = cell
        cell.style.width = '12%'
        cell.style.height = '12%'
        chessboardCells.push(cell)
      }
    }
  }
  pieceImages = {}
  for (const piece of allPieces) {
    const pieceImage = document.createElement('img')
    pieceImage.id = `${piece.type}-${piece.color}-${piece.start}`
    pieceImage.src = `themes/${window.themeName}/${piece.image}`
    pieceImage.className = 'chessboard-piece'
    pieceContainer.appendChild(pieceImage)
    pieceImages[`${piece.type}-${piece.color}-${piece.start}`] = pieceImage
  }
}

window.renderChessBoard = (event) => {
  if (!window.pieces || !window.pieces.length) {
    return
  }
  if (!cellSize || (event && event.type === 'resize')) {
    if (document.body.offsetWidth < document.body.offsetHeight) {
      cellSize = Math.min(document.body.offsetWidth / 8.5, convertRemToPixels(4))
    } else {
      cellSize = Math.min(document.body.offsetWidth / 3 / 8.5, convertRemToPixels(4))
    }
    halfCellSize = cellSize / 2
    quarterCellSize = halfCellSize / 2
    eighthCellSize = quarterCellSize / 2
    chessboard.parentNode.style.width = chessboard.style.width = chessboard.style.height = (cellSize * 8) + 'px'
    chessboard.parentNode.style.marginLeft = chessboard.parentNode.style.marginTop = cellSize / 4
    if (arrowContainer) {
      arrowContainer.style.width = arrowContainer.style.height = chessboard.offsetWidth + 'px'
      arrowContainer.innerHTML = ''
      arrowContainer.classList.remove('fade-in')
    }
  }
  for (const cell of chessboardCells) {
    cell.className = cell.originalClassName
  }
  if (arrowContainer) {
    arrowContainer.innerHTML = ''
  }
  const usedPieces = []
  const movingPieces = []
  // track used pieces
  let pieceImage
  for (const piece of window.pieces) {
    pieceImage = pieceImages[`${piece.type}-${piece.color}-${piece.start}`]
    pieceImage.classList.remove('fade-out')
    pieceImage.style.transition = ''
    usedPieces.push(`${piece.type}-${piece.color}-${piece.start}`)
    if (piece.moveSteps) {
      movingPieces.push(piece)
    }
    if (pieceImage.style.width !== `${cellSize}px` || (event && event.type === 'resize')) {
      const cellNumber = '87654321'.indexOf(piece.coordinate[1])
      const rowNumber = 'abcdefgh'.indexOf(piece.coordinate[0])
      const cellX = cellNumber * cellSize
      const cellY = rowNumber * cellSize
      const leftStyle = `${cellY}px`
      const topStyle = `${cellX}px`
      pieceImage.style.transitionDuration = 0
      pieceImage.style.left = leftStyle
      pieceImage.style.top = topStyle
      pieceImage.style.width = `${cellSize}px`
      pieceImage.style.height = `${cellSize}px`
    }
  }
  // remove any unused pieces
  if (usedPieces.length !== allPieces.length) {
    for (const piece of allPieces) {
      if (usedPieces.indexOf(`${piece.type}-${piece.color}-${piece.start}`) > -1) {
        continue
      }
      pieceImage = pieceImages[`${piece.type}-${piece.color}-${piece.start}`]
      pieceImage.classList.add('fade-out')
    }
  }
  if (window.turn === -1) {
    headerContainer.style.display = ''
    return
  }
  const columns = document.querySelector('.columns')
  columns.style.height = chessboard.parentNode.parentNode.offsetHeight + 'px'

  // play move sequence, this is at least the movement
  // arrow and piece sliding but may include more
  const move = window.turns[window.turn]
  const sequence = processSequence(move)
  headerContainer.style.display = 'none'
  let step = 0
  function nextSequenceStep () {
    const delay = parseSequenceStep(move, sequence[step], movingPieces)
    step++
    if (step === sequence.length) {
      return
    }
    return setTimeout(nextSequenceStep, delay)
  }
  return nextSequenceStep()
}

function parseSequenceStep (move, step, movingPieces) {
  // highlight arrow or square
  if (step.type === 'highlight') {
    if (step.arrow) {
      const arrow = drawArrow(step.color, step.from, step.to)
      arrow.classList.add('chessboard-arrow')
      arrow.classList.add(`${step.color}-arrow`)
      arrowContainer.innerHTML += ''
      arrowContainer.classList.add('fade-in')
    } else if (step.square) {
      const square = cellIndex[step.coordinate]
      square.classList.add(`${step.color}-square`)
    }
    return 0
  }
  // move arrow
  if (step.type === 'arrow' && step.arrow === 'move') {
    for (const piece of movingPieces) {
      const castlingOffset = piece.type === 'K' ? -1 : 1
      const arrow = drawArrow('move', piece.coordinateBefore, piece.coordinate, piece.moveSteps, move.kingSideCastling || move.queenSideCastling ? castlingOffset : 0)
      arrow.classList.add('chessboard-arrow')
      arrow.classList.add('move-arrow')
    }
    arrowContainer.innerHTML += ''
    arrowContainer.classList.add('fade-in')
    return 500
  }
  // move coordinate
  if (step.move) {
    for (const piece of movingPieces) {
      const cellNumber = '87654321'.indexOf(piece.coordinate[1])
      const rowNumber = 'abcdefgh'.indexOf(piece.coordinate[0])
      const cellX = cellNumber * cellSize
      const cellY = rowNumber * cellSize
      const leftStyle = `${cellY}px`
      const topStyle = `${cellX}px`
      const pieceImage = pieceImages[`${piece.type}-${piece.color}-${piece.start}`]
      pieceImage.style.left = leftStyle
      pieceImage.style.top = topStyle
      pieceImage.style.transitionDuration = '800ms'
      pieceImage.style.transitionProperty = 'left,top'
    }
    return 800
  }
}

function drawArrow (arrowType, firstCoordinate, lastCoordinate, moveSteps, offsetForCastling) {
  const previousValues = {}
  if (!moveSteps) {
    moveSteps = [firstCoordinate, lastCoordinate]
  }
  let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  arrowContainer.appendChild(svg)
  svg = arrowContainer.lastChild
  svg.setAttribute('style', `stroke-width: ${eighthCellSize}; width: ${chessboard.offsetWidth}px; height: ${chessboard.offsetHeight}px`)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)
  const markerWidth = convertRemToPixels(1) / 4
  const markerHeight = convertRemToPixels(1) / 4
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  marker.id = `arrow-${arrowType}-${firstCoordinate}-${lastCoordinate}`
  marker.setAttributeNS(null, 'markerWidth', markerWidth)
  marker.setAttributeNS(null, 'markerHeight', markerHeight)
  marker.setAttributeNS(null, 'refX', 0)
  marker.setAttributeNS(null, 'refY', markerHeight / 2)
  marker.setAttributeNS(null, 'orient', 'auto')
  defs.appendChild(marker)
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  polygon.setAttributeNS(null, 'points', `0,0 ${markerWidth},${markerHeight / 2} 0,${markerHeight}`)
  polygon.style.strokeWidth = 0
  marker.appendChild(polygon)
  for (const i in moveSteps) {
    const stepCoordinate = moveSteps[i]
    const cell = cellIndex[stepCoordinate]
    if (stepCoordinate === firstCoordinate) {
      const xPosition = cell.offsetLeft + halfCellSize
      let yPosition = cell.offsetTop + halfCellSize
      if (offsetForCastling) {
        yPosition += offsetForCastling * quarterCellSize
      }
      previousValues.xPosition = xPosition
      previousValues.yPosition = yPosition
      continue
    }
    const previousCell = cellIndex[moveSteps[i - 1]]
    const previousStepColumn = previousCell.id[0]
    const previousStepRow = previousCell.id[1]
    const currentStepColumn = stepCoordinate[0]
    const currentStepRow = stepCoordinate[1]
    const columnDifference = calculateColumnDifference(previousStepColumn, currentStepColumn)
    const rowDifference = parseInt(previousStepRow, 10) - parseInt(currentStepRow, 10)
    let xPosition = cell.offsetLeft + halfCellSize
    let yPosition = cell.offsetTop + halfCellSize
    if (offsetForCastling) {
      yPosition += offsetForCastling * quarterCellSize
    }
    const line = document.createElement('line')
    line.setAttributeNS(null, 'x1', previousValues.xPosition)
    line.setAttributeNS(null, 'y1', previousValues.yPosition)
    if (stepCoordinate === lastCoordinate) {
      line.setAttributeNS(null, 'marker-end', `url(#arrow-${arrowType}-${firstCoordinate}-${lastCoordinate})`)
      // deduct some length to fit the arrowhead
      if (columnDifference > 0) {
        xPosition += halfCellSize
      } else if (columnDifference < 0) {
        xPosition -= halfCellSize
      }
      if (rowDifference > 0) {
        yPosition -= halfCellSize
      } else if (rowDifference < 0) {
        yPosition += halfCellSize
      }
    }
    line.setAttributeNS(null, 'x2', xPosition)
    line.setAttributeNS(null, 'y2', yPosition)
    svg.appendChild(line)
    previousValues.xPosition = xPosition
    previousValues.yPosition = yPosition
  }
  return svg
}

function calculateColumnDifference (column1, column2) {
  const index1 = 'abcdefgh'.indexOf(column1)
  const index2 = 'abcdefgh'.indexOf(column2)
  if (index1 > index2) {
    return 1
  } else if (index1 === index2) {
    return 0
  } else {
    return -1
  }
}

function processSequence (move) {
  const sequence = []
  for (const segment of move.sequence) {
    if (segment.startsWith('$')) {
      continue
    }
    if (segment.startsWith('[%cal ')) {
      const arrow = true
      const targets = segment.substring(segment.indexOf(' ') + 1, segment.indexOf(']')).split(',')
      for (const target of targets) {
        let color = target.trim().substring(0, 1)
        if (color === 'R') {
          color = 'red'
        } else if (color === 'B') {
          color = 'blue'
        } else if (color === 'Y') {
          color = 'yellow'
        } else if (color === 'G') {
          color = 'green'
        }
        let coordinate = target.trim().substring(1)
        let from, to
        if (coordinate.length === 4) {
          from = coordinate.substring(0, 2)
          to = coordinate.substring(2)
          coordinate = null
        }
        sequence.push({ type: 'highlight', arrow, color, from, to, annotation: segment.annotation })
      }
      continue
    }
    if (segment.startsWith('[%csl')) {
      const square = true
      const targets = segment.substring(segment.indexOf(' ') + 1, segment.indexOf(']')).split(',')
      for (const target of targets) {
        let color = target.trim().substring(0, 1)
        if (color === 'R') {
          color = 'red'
        } else if (color === 'B') {
          color = 'blue'
        } else if (color === 'Y') {
          color = 'yellow'
        } else if (color === 'G') {
          color = 'green'
        }
        const coordinate = target.trim().substring(1).split(',')
        sequence.push({ type: 'highlight', square, color, coordinate, annotation: segment.annotation })
      }
      continue
    }
    if (segment.startsWith('{')) {
      sequence.push({ type: 'annotation', annotation: segment.substring(1, segment.length - 1) })
      continue
    }
    sequence.push({ type: 'arrow', arrow: 'move' }, { type: 'move', move: segment })
  }
  return sequence
}

function convertRemToPixels (rem) {
  return rem * parseFloat(window.getComputedStyle(document.documentElement).fontSize)
}




let header

window.setupHeader = () => {
  header = document.querySelector('.header')
}

window.refreshHeader = () => {
  if (!header) {
    return
  }
  const properties = Object.keys(window.pgn.tags)
  if (properties.indexOf('White') === -1) {
    properties.push('White')
  }
  if (properties.indexOf('Black') === -1) {
    properties.push('Black')
  }
  if (properties.indexOf('Result') === -1) {
    properties.push('Result')
  }
  for (const property of properties) {
    const element = document.querySelector(`.header-${property.toLowerCase()}`)
    if (!element) {
      continue
    }
    if (window.pgn.tags[property] === '?') {
      continue
    }
    if (property === 'Site') {
      element.innerHTML = '(' + (window.pgn.tags[property] || '?') + ')'
    } else if (property === 'Round') {
      element.innerHTML = '[' + (window.pgn.tags[property] || '?') + ']'
    } else {
      element.innerHTML = window.pgn.tags[property] || '?'
    }
  }
  if (window.pgn.tags.White !== '?' && window.pgn.tags.Black === '?') {
    document.querySelector('.header-title').innerHTML = `<span class="header-player-name">${window.pgn.tags.White}</span>`
  }
}




window.defaultPieces = JSON.stringify([
  { type: 'R', color: 'b', start: 'a8', coordinate: 'a8', image: 'bR.png' },
  { type: 'N', color: 'b', start: 'b8', coordinate: 'b8', image: 'bN.png' },
  { type: 'B', color: 'b', start: 'c8', coordinate: 'c8', image: 'bB.png' },
  { type: 'Q', color: 'b', start: 'd8', coordinate: 'd8', image: 'bQ.png' },
  { type: 'K', color: 'b', start: 'e8', coordinate: 'e8', image: 'bK.png' },
  { type: 'B', color: 'b', start: 'f8', coordinate: 'f8', image: 'bB.png' },
  { type: 'N', color: 'b', start: 'g8', coordinate: 'g8', image: 'bN.png' },
  { type: 'R', color: 'b', start: 'h8', coordinate: 'h8', image: 'bR.png' },
  { type: 'P', color: 'b', start: 'a7', coordinate: 'a7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'b7', coordinate: 'b7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'c7', coordinate: 'c7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'd7', coordinate: 'd7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'e7', coordinate: 'e7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'f7', coordinate: 'f7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'g7', coordinate: 'g7', image: 'bP.png' },
  { type: 'P', color: 'b', start: 'h7', coordinate: 'h7', image: 'bP.png' },
  { type: 'P', color: 'w', start: 'a2', coordinate: 'a2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'b2', coordinate: 'b2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'c2', coordinate: 'c2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'd2', coordinate: 'd2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'e2', coordinate: 'e2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'f2', coordinate: 'f2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'g2', coordinate: 'g2', image: 'oP.png' },
  { type: 'P', color: 'w', start: 'h2', coordinate: 'h2', image: 'oP.png' },
  { type: 'R', color: 'w', start: 'a1', coordinate: 'a1', image: 'oR.png' },
  { type: 'N', color: 'w', start: 'b1', coordinate: 'b1', image: 'oN.png' },
  { type: 'B', color: 'w', start: 'c1', coordinate: 'c1', image: 'oB.png' },
  { type: 'Q', color: 'w', start: 'd1', coordinate: 'd1', image: 'oQ.png' },
  { type: 'K', color: 'w', start: 'e1', coordinate: 'e1', image: 'oK.png' },
  { type: 'B', color: 'w', start: 'f1', coordinate: 'f1', image: 'oB.png' },
  { type: 'N', color: 'w', start: 'g1', coordinate: 'g1', image: 'oN.png' },
  { type: 'R', color: 'w', start: 'h1', coordinate: 'h1', image: 'oR.png' }
])

window.onload = function () {
  // theme
  const themes = window.themes || [
    'default'
  ]
  const urlParams = new URLSearchParams(window.location.search)
  window.themeName = window.localStorage.getItem('theme') || urlParams.get('theme') || themes[0]
  const link = document.createElement('link')
  link.href = `themes/${window.themeName}/theme.css`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
  // shared method for loading PGN file/text
  window.loadPGNFile = (pgnFileData) => {
    window.turn = -1
    window.pieces = JSON.parse(window.defaultPieces)
    window.pgnRaw = pgnFileData
    try {
      window.pgn = window.parser.parse(pgnFileData)
    } catch (error) {
      return errorMessage(error.message)
    }
    window.turns = window.pgn.turns
    if (!window.components || !window.components.length) {
      const allComponents = [
        { name: 'chessboard', setup: window.setupChessBoard, refresh: window.renderChessBoard },
        { name: 'move-description', setup: window.setupMoveDescription, refresh: window.renderMoveDescription },
        { name: 'playback', setup: window.setupPlayback, refresh: window.refreshPlayback },
        { name: 'header', setup: window.setupHeader, refresh: window.refreshHeader },
        { name: 'tabs', setup: window.setupTabs },
        { name: 'annotations', setup: window.annotations.setupAnnotations, refresh: window.annotations.refreshAnnotations },
        { name: 'pgn', setup: window.setupPGN, refresh: window.refreshPGN },
        { name: 'tags', setup: window.setupTags }
      ]
      window.components = []
      for (const component of allComponents) {
        const element = document.getElementsByClassName(component.name)
        if (!element || !component.setup) {
          continue
        }
        component.setup()
        window.components.push(component)
      }
      window.addEventListener('refresh', refresh)
      window.addEventListener('resize', refresh)
    }
    return refresh()
  }

  function errorMessage (message) {
    console.log('error message', message)
  }

  function refresh (event) {
    if (window.turn === -1) {
      window.pieces = JSON.parse(window.defaultPieces)
    } else if (window.turns === window.pgn.turns && window.turn === window.pgn.turns.length - 1) {
      window.pieces = window.turns[window.turn].pieces
    } else {
      window.pieces = window.turns[window.turn].pieces
    }
    for (const component of window.components) {
      if (component.refresh) {
        component.refresh(event)
      }
    }
  }
  // preload the piece images
  const pieceImages = []
  for (const piece of 'QBKNPR') {
    pieceImages.push(`themes/${window.themeName}/o${piece}.png`)
    pieceImages.push(`themes/${window.themeName}/b${piece}.png`)
  }

  function loadNextImage () {
    if (pieceImages.length === 0) {
      if (window.pgnRaw) {
        return window.loadPGNFile(window.pgnRaw)
      }
      const url = urlParams.get('url') || '/sample1.pgn'
      if (url) {
        return window.Request.get(url, (error, pgnFileData) => {
          if (error) {
            return errorMessage(error.message)
          }
          return window.loadPGNFile(pgnFileData)
        })
      }
    }
    const image = new window.Image()
    image.src = pieceImages.pop()
    image.onload = loadNextImage
  }
  return loadNextImage()
}




let moveDescription, nags

const pieceNameIndex = {
  K: 'King',
  Q: 'Queen',
  B: 'Bishop',
  N: 'Knight',
  R: 'Rook',
  P: 'Pawn'
}

window.setupMoveDescription = () => {
  moveDescription = document.querySelector('.move-description')
  nags = {}
  const nagIndex = document.querySelector('#nag-index')
  for (const option of nagIndex.content.children) {
    nags[option.value] = option.text
  }
}

window.renderMoveDescription = () => {
  if (window.turn === -1) {
    moveDescription.style.display = 'none'
    return
  }

  const descriptionText = [
    describeMove()
  ]
  const move = window.turns[window.turn]
  for (const segment of move.sequence) {
    if (segment.startsWith('$')) {
      const nag = nags[segment]
      descriptionText.push(`. <span class="annotation">${nag}</span>`)
      continue
    }
    if (segment.startsWith('[%cal ')) {
      continue
    }
    if (segment.startsWith('[%csl')) {
      continue
    }
    if (segment.startsWith('{')) {
      let cleaned = segment
      while (cleaned.indexOf('[') > -1) {
        cleaned = cleaned.replace(/\[.*?\]/g, '').trim()
      }
      cleaned = cleaned.split('{').join('').split('}').join('').trim()
      if (!cleaned.length) {
        continue
      }
      descriptionText.push(`. <span class="annotation">${cleaned}</span>`)
      continue
    }
  }
  moveDescription.innerHTML = descriptionText.join('')
  moveDescription.style.display = ''
}

function describeMove () {
  if (window.turn > -1) {
    const move = window.turns[window.turn]
    let parts = [move.moveNumber + '.']
    if (move.color === 'w') {
      parts.push('White')
    } else {
      parts.push('Black')
    }
    if (move.queenSideCastling) {
      parts.push('castles')
    } else if (move.kingSideCastling) {
      parts.push('castles')
    } else if (move.coordinateBefore) {
      parts.push(pieceNameIndex[move.type], 'to', move.coordinateBefore)
    }
    if (move.capturing) {
      parts.push('captures', move.to)
    } else if (move.to) {
      parts.push('to', move.to)
    }
    if (move.promoted) {
      parts.push('and promotes', pieceNameIndex[move.type], 'to', move.promoted)
    }
    if (move.checkMate) {
      parts.push('and checkmate')
    } else if (move.check) {
      parts.push('and checks')
    } else if (window.turns === window.pgn.turns && window.turn === window.pgn.turns.length - 1) {
      parts.push('game ends')
    }
    if (move.annotations && move.annotations.length) {
      if (move.annotations.join('').trim()) {
        parts = move.annotations
      }
    }
    return parts.join(' ').replace(' .', '.')
  }
}




let viewPGN

window.setupPGN = () => {
  viewPGN = document.querySelector('.pgn')
  const saveButton = document.querySelector('.file-save-as')
  if (saveButton && saveButton) {
    saveButton.onclick = () => {
      const filename = (window.pgn.tags.White || 'unknown') + '-vs-' + (window.pgn.tags.Black || 'unknown') + '-' + (window.pgn.tags.Result || 'unknown') + '.pgn'
      const file = new window.Blob([window.pgn.toString()], { type: 'pgn' })
      if (window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(file, filename) } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        }, 0)
      }
    }
  }
  const menuContainer = document.querySelector('.pgn-controls')
  const loadPasteButton = document.querySelector('.file-load-pasted-pgn')
  if (loadPasteButton) {
    loadPasteButton.onclick = () => {
      const loadText = document.querySelector('.paste-pgn')
      if (!loadText || !loadText.value || !loadText.value.length) {
        return
      }
      window.loadPGNFile(loadText.value)
      loadText.value = ''
      pasteContainer.style.display = 'none'
      viewPGN.style.display = 'block'
      menuContainer.style.display = 'block'
    }
  }
  const pasteContainer = document.querySelector('.paste-pgn-container')
  const cancelPastebutton = document.querySelector('.file-cancel-paste')
  if (cancelPastebutton) {
    cancelPastebutton.onclick = () => {
      pasteContainer.style.display = 'none'
      viewPGN.style.display = 'block'
      menuContainer.style.display = 'block'
    }
  }
  const pasteTextButton = document.querySelector('.file-paste')
  if (pasteTextButton) {
    pasteTextButton.onclick = () => {
      pasteContainer.style.display = 'block'
      viewPGN.style.display = 'none'
      menuContainer.style.display = 'none'
    }
  }
  const openButton = document.querySelector('.file-open')
  if (openButton && openButton) {
    openButton.onclick = () => {
      const uploadInput = document.createElement('input')
      uploadInput.type = 'file'
      uploadInput.onchange = e => {
        const file = e.target.files[0]
        const reader = new window.FileReader()
        reader.readAsText(file, 'UTF-8')
        reader.onload = (readerEvent) => {
          window.loadPGNFile(readerEvent.target.result)
        }
      }
      return uploadInput.click()
    }
  }
}

window.refreshPGN = () => {
  if (!viewPGN) {
    return
  }
  viewPGN.innerHTML = window.pgn.toString()
}




let playInterval, timelineContainer, timelines, allTimelines, maximumFrames, cellWidth
let moveToCellOnHover = false

window.setupPlayback = () => {
  timelineContainer = document.querySelector('.timeline-container')
  timelineContainer.onmousedown = document.ontouchstart = () => {
    moveToCellOnHover = true
  }
  document.onmouseup = document.ontouchend = () => {
    moveToCellOnHover = false
  }
  timelines = []
  allTimelines = []
  maximumFrames = findLongestFrames(window.pgn.turns, 0)
  timelineContainer.innerHTML = ''
  renderNestedTimeline(window.pgn.turns, null, null)
  // playback frame-move buttons
  const playNestedMoves = document.querySelector('.play-nested-moves')
  const backToStartButton = document.querySelector('.playback-start')
  if (backToStartButton) {
    backToStartButton.onclick = () => {
      if (window.turn === -1) {
        return
      }
      if (playInterval) {
        clearPlayInterval()
      }
      window.turnToStart()
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    }
  }
  const forwardToEndButton = document.querySelector('.playback-end')
  if (forwardToEndButton) {
    forwardToEndButton.onclick = () => {
      if (playInterval) {
        clearPlayInterval()
      }
      if (window.turn === window.turns.length - 1) {
        return
      }
      window.turnToEnd()
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    }
  }
  const backwardButton = document.querySelector('.playback-rewind')
  if (backwardButton) {
    backwardButton.onclick = () => {
      if (playInterval) {
        clearPlayInterval()
      }
      const moved = window.turnToPreviousMove(playNestedMoves.checked)
      if (moved) {
        return window.dispatchEvent(new window.CustomEvent('refresh'))
      }
    }
  }
  const forwardButton = document.querySelector('.playback-forward')
  if (forwardButton) {
    forwardButton.onclick = () => {
      if (playInterval) {
        clearPlayInterval()
      }
      const moved = window.turnToNextMove(playNestedMoves.checked)
      if (moved) {
        return window.dispatchEvent(new window.CustomEvent('refresh'))
      }
    }
  }
  // play back buttons
  const playButton = document.querySelector('.playback-play')
  if (playButton) {
    playButton.onclick = () => {
      if (playInterval) {
        return clearPlayInterval()
      }
      let delayed
      if (window.turn === window.turns.length - 1) {
        const moved = window.turnToPreviousMove(playNestedMoves.checked)
        if (!moved) {
          return
        }
        window.dispatchEvent(new window.CustomEvent('refresh'))
        delayed = true
      }
      // start the timer
      playInterval = setInterval(() => {
        const moved = window.turnToNextMove(playNestedMoves.checked)
        if (!moved) {
          return
        }
        return window.dispatchEvent(new window.CustomEvent('refresh'))
      }, 2400)
      playButton.classList.add('button-down')
      playButton.firstChild.className = 'fas fa-stop'
      // manually move immediately
      const moved = window.turnToNextMove(playNestedMoves.checked)
      if (!moved) {
        return
      }
      if (delayed) {
        return setTimeout(() => {
          return window.dispatchEvent(new window.CustomEvent('refresh'))
        }, 600)
      }
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    }
  }
}

function clearPlayInterval () {
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
  const playButton = document.querySelector('.playback-play')
  if (playButton) {
    playButton.classList.remove('button-down')
    playButton.firstChild.className = 'fas fa-play'
  }
}

function hoverCell (event) {
  if (!moveToCellOnHover) {
    return
  }
  let frame = event.target
  if (frame.moveNumber === undefined) {
    frame = frame.parentNode
  }
  if (frame.moveNumber === undefined) {
    return
  }
  window.turns = frame.moves
  window.turn = frame.moveNumber
  return window.dispatchEvent(new window.CustomEvent('refresh'))
}
function clickCell (event) {
  let frame = event.target
  if (frame.moveNumber === undefined) {
    frame = frame.parentNode
  }
  if (frame.moveNumber === undefined) {
    return
  }
  window.turns = frame.moves
  window.turn = frame.moveNumber
  return window.dispatchEvent(new window.CustomEvent('refresh'))
}

// timelines
function createTimeline (moves) {
  const timeline = document.createElement('div')
  timeline.className = `timeline timeline${timelineContainer.children.length + 1}`
  const timelineBar = document.createElement('div')
  timelineBar.className = 'timeline-bar'
  timeline.appendChild(timelineBar)
  const cellPercent = ((1 / moves.length) * 100) + '%'
  for (const i in moves) {
    const frame = document.createElement('span')
    frame.className = 'frame'
    frame.moves = moves
    frame.moveNumber = parseInt(i, 10)
    frame.move = moves[i]
    frame.onmousedown = clickCell
    frame.onmouseover = hoverCell
    frame.style.width = cellPercent
    frame.className = 'frame'
    if (i % 2 !== 0) {
      frame.className += ' alternating-frame'
    }
    frame.title = moves[i].pgn
    if (moves[i].annotations && moves[i].annotations.length) {
      frame.innerHTML = '!'
    }
    timelineBar.appendChild(frame)
  }
  return timelineBar
}

function findLongestFrames (moves, offset) {
  let maximumFrames = 0
  offset = offset || 0
  if (offset + moves.length > maximumFrames) {
    maximumFrames = offset + moves.length
  }
  for (const move of moves) {
    const moveOffset = offset + moves.indexOf(move)
    if (move.siblings) {
      for (const sibling of move.siblings) {
        const nestedMaximum = findLongestFrames(sibling, moveOffset)
        if (nestedMaximum > maximumFrames) {
          maximumFrames = nestedMaximum
        }
      }
    }
  }
  return maximumFrames
}

function renderNestedTimeline (moves, parentTimeline, startPosition) {
  const timeline = createTimeline(moves, parentTimeline)
  timeline.style.top = 0
  timeline.parentTimeline = parentTimeline
  timeline.moves = moves
  timelineContainer.appendChild(timeline.parentNode)
  timeline.lineage = []
  if (parentTimeline) {
    timeline.lineage = timeline.lineage.concat(parentTimeline.lineage)
    timeline.lineage.push(parentTimeline)
  }
  for (const move of moves) {
    if (!move.siblings || !move.siblings.length) {
      continue
    }
    for (const sibling of move.siblings) {
      renderNestedTimeline(sibling, timeline, moves.indexOf(move), maximumFrames)
    }
  }
  const line = document.createElement('div')
  line.className = 'connecting-line'
  timeline.parentNode.appendChild(line)
  const timelineData = {
    timeline,
    line,
    x: parentTimeline ? parentTimeline.children[startPosition].offsetLeft : 0,
    width: moves.length,
    moveWidth: timeline.moveWidth,
    moves,
    parentTimeline,
    startPosition: startPosition || 0,
    lineage: timeline.lineage
  }
  timelineData.lineage = []
  if (parentTimeline) {
    timelineData.lineage = timelineData.lineage.concat(parentTimeline.lineage)
    timelineData.lineage.push(parentTimeline)
    timelines.unshift(timelineData)
  }
  allTimelines.push(timelineData)
}

function findNextTimeline (moves) {
  for (const timeline of timelines) {
    if (timeline.moves === moves) {
      // go to the next sibling
      const parentMoves = timeline.parentTimeline.moves
      const parentMove = timeline.startPosition || 0
      const index = parentMoves[parentMove].siblings.indexOf(moves)
      if (index < parentMoves[parentMove].siblings.length - 1) {
        return {
          moves: parentMoves[parentMove].siblings[index + 1],
          move: 0
        }
      }
      // go to the parent timeline
      return {
        moves: timeline.parentTimeline.moves,
        move: (timeline.startPosition || 0) + 1
      }
    }
  }
}

function findPreviousTimeline (moves) {
  for (const timeline of timelines) {
    if (timeline.moves === moves) {
      // go to the next sibling
      const parentMoves = timeline.parentTimeline.moves
      const parentMove = timeline.startPosition || 0
      const index = parentMoves[parentMove].siblings.indexOf(moves)
      if (index > 0) {
        return {
          moves: parentMoves[parentMove].siblings[index - 1],
          move: parentMoves[parentMove].siblings[index - 1].length - 1
        }
      }
      // go to the parent timeline
      return {
        moves: timeline.parentTimeline.moves,
        move: timeline.startPosition
      }
    }
  }
}

window.turnToNextMove = (playNestedMoves) => {
  if (playNestedMoves && window.turn > -1) {
    const move = window.turns[window.turn]
    // play a nested timeline
    if (move.siblings && move.siblings.length) {
      let index = 0
      if (window.playingSiblings === move.siblings) {
        index = window.playingSiblingsIndex
      }
      window.playingSiblings = move.siblings
      window.playingSiblingsIndex = index
      window.turn = 0
      window.turns = move.siblings[index]
      return true
    }
    // finished playing a nested timeline
    if (window.turn === window.turns.length - 1) {
      const parentMove = findNextTimeline(window.turns)
      if (parentMove) {
        window.turns = parentMove.moves
        window.turn = parentMove.move
        return true
      }
    }
  }
  if (window.turn === window.turns.length - 1) {
    return false
  }
  window.turn++
  return true
}
window.turnToPreviousMove = (playNestedMoves) => {
  if (playNestedMoves && window.turn === 0) {
    const parentMove = findPreviousTimeline(window.turns)
    if (parentMove) {
      window.turns = parentMove.moves
      window.turn = parentMove.move
      return true
    }
  }
  if (window.turn === 0) {
    return false
  }
  window.turn--
  return true
}
window.turnToStart = () => {
  window.turn = -1
  window.turns = window.pgn.turns
  window.pieces = JSON.parse(window.defaultPieces)
}
window.turnToEnd = () => {
  window.turn = window.turns.length - 1
}
window.refreshPlayback = (event) => {
  if (!cellWidth || (event && event.type === 'resize')) {
    cellWidth = document.querySelector('.right').offsetWidth / (maximumFrames + 1)
  }
  // highlight current frame and bar
  const activeFrame = document.querySelector('.current-move-frame')
  if (activeFrame) {
    activeFrame.classList.remove('current-move-frame')
  }
  const activeBar = document.querySelector('.active-bar')
  if (activeBar) {
    activeBar.classList.remove('active-bar')
  }
  let activeTimeline
  for (const timeline of allTimelines) {
    if (timeline.moves !== window.turns) {
      continue
    }
    activeTimeline = timeline
    timeline.timeline.classList.add('active-bar')
    if (window.turn > -1) {
      timeline.timeline.children[window.turn].classList.add('current-move-frame')
    }
  }
  // hide inactive timelines and resize visible ones
  for (const timeline of allTimelines) {
    timeline.timeline.style.width = (cellWidth * timeline.moves.length) + 'px'
    if (timeline.parentTimeline) {
      timeline.timeline.style.left = timeline.line.style.left = (cellWidth * timeline.startPosition) + 'px'
    }
    if (timeline === activeTimeline) {
      timeline.timeline.parentNode.style.opacity = '1'
    } else {
      timeline.timeline.parentNode.style.opacity = '0.6'
    }
  }
  // position the visible timelines
  const oneRem = convertRemToPixels(1)
  const twoRem = oneRem * 2
  const onePointFiveRem = oneRem * 1.75
  let position = 1
  let previous
  // compress timelines into the same y-level where spacing allows
  for (const timeline of timelines) {
    if (timeline.timeline.parentNode.style.display === 'none') {
      continue
    }
    if (previous && previous.parentTimeline === timeline.parentTimeline) {
      const timelineX = timeline.timeline.offsetLeft
      const timelineWidth = timeline.timeline.offsetWidth
      const previousX = previous.timeline.offsetLeft
      const previousWidth = previous.timeline.offsetWidth
      if (timelineX + timelineWidth < previousX || timelineX > previousX + previousWidth) {
        timeline.timeline.style.top = previous.timeline.style.top
        const topValue = parseInt(timeline.timeline.style.top.replace('px', ''), 10)
        const parentTopValue = parseInt(timeline.parentTimeline.style.top.replace('px', ''), 10)
        timeline.line.style.top = (parentTopValue + timeline.parentTimeline.offsetHeight) + 'px'
        timeline.line.style.height = (topValue - parentTopValue - timeline.timeline.offsetHeight + 2) + 'px'
        previous = timeline
        continue
      }
    }
    timeline.timeline.style.top = (position * onePointFiveRem) + 'px'
    if (timeline.parentTimeline) {
      const topValue = parseInt(timeline.timeline.style.top.replace('px', ''), 10)
      const parentTopValue = parseInt(timeline.parentTimeline.style.top.replace('px', ''), 10)
      timeline.line.style.top = (parentTopValue + timeline.parentTimeline.offsetHeight) + 'px'
      timeline.line.style.height = (topValue - parentTopValue - timeline.timeline.offsetHeight + 2) + 'px'
    }
    position++
    previous = timeline
  }
  if (document.body.offsetHeight > document.body.offsetWidth) {
    timelineContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.playback-container').offsetHeight - document.querySelector('.move-description').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
  } else {
    timelineContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.playback-container').offsetHeight - document.querySelector('.move-description').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
  }
  timelineContainer.style.overflow = 'scroll'
  // adjust nested timeline size up to 4x if space allows
  const maximumWidth = timelineContainer.offsetWidth
  for (const adjustingTimeline of timelines) {
    if (adjustingTimeline.timeline.children[0].offsetWidth > 30) {
      continue
    }
    const baseWidth = adjustingTimeline.timeline.offsetWidth
    const adjustingX = parseInt(adjustingTimeline.timeline.style.left.replace('px', ''), 10)
    let adjustingWidth
    let increase = 0
    let unblocked = true
    while (unblocked) {
      increase++
      adjustingWidth = increase * baseWidth
      const frameSize = adjustingWidth / adjustingTimeline.moves.length
      if (frameSize > twoRem) {
        unblocked = false
        increase--
        break
      }
      for (const timeline of timelines) {
        if (timeline === adjustingTimeline || adjustingTimeline.timeline.style.top !== timeline.timeline.style.top || timeline.timeline.offsetLeft < adjustingX) {
          continue
        }
        if (adjustingX + adjustingWidth >= timeline.timeline.offsetLeft) {
          unblocked = false
          increase--
          break
        }
      }
      if (adjustingX + adjustingWidth >= maximumWidth) {
        unblocked = false
        increase--
        break
      }
      if (increase > 4) {
        break
      }
    }
    if (increase) {
      adjustingTimeline.timeline.style.width = (baseWidth * increase) + 'px'
    }
  }
}

function convertRemToPixels (rem) {
  return rem * parseFloat(window.getComputedStyle(document.documentElement).fontSize)
}




let useXMLHttpRequest, compatibleActiveXObject

window.Request = {
  get: function (url, callback) {
    return send(url, null, 'GET', callback)
  },
  post: function (url, data, callback) {
    return send(url, data, 'POST', callback)
  },
  put: function (url, data, callback) {
    return send(url, data, 'PUT', callback)
  },
  patch: function (url, data, callback) {
    return send(url, data, 'PATCH', callback)
  },
  del: function (url, data, callback) {
    return send(url, data, 'DELETE', callback)
  }
}

function send (url, data, method, callback) {
  const dataString = []
  for (const field in data) {
    dataString.push(`${field}=${encodeURI(data[field])}`)
  }
  const x = getRequest()
  x.open(method, url, true)
  x.onreadystatechange = function () {
    if (x.readyState !== 4) {
      return
    }
    return callback(null, x.responseText)
  }
  x.send(dataString.join('&'))
  return x
}

function getRequest () {
  if (useXMLHttpRequest || typeof XMLHttpRequest !== 'undefined') {
    useXMLHttpRequest = true
    return new window.XMLHttpRequest()
  }
  if (compatibleActiveXObject !== null) {
    return new window.ActiveXObject(compatibleActiveXObject)
  }
  let xhr
  const xhrversions = ['MSXML2.XmlHttp.5.0', 'MSXML2.XmlHttp.4.0', 'MSXML2.XmlHttp.3.0', 'MSXML2.XmlHttp.2.0', 'Microsoft.XmlHttp']
  for (let i = 0, len = xhrversions.length; i < len; i++) {
    try {
      xhr = new window.ActiveXObject(xhrversions[i])
      compatibleActiveXObject = xhrversions[i]
      return xhr
    } catch (e) { }
  }
}





window.setupTabs = () => {
  const containers = [
    'playback',
    'annotations',
    'pgn',
    'tags'
  ]
  const tabControls = document.querySelectorAll('.tab')
  const left = document.querySelector('.left')
  const right = document.querySelector('.right')
  for (const button of tabControls) {
    button.addEventListener('click', (event) => {
      const id = event.target.className.replace('tab', '').replace('control-', '').replace('current-tab', '').trim()
      for (const containerid of containers) {
        const container = document.querySelector(`.${containerid}-container`)
        if (!container) {
          continue
        }
        const containerButton = document.querySelector(`.control-${containerid}`)
        if (id === containerid) {
          container.style.display = 'block'
          containerButton.classList.add('current-tab')
        } else {
          container.style.display = 'none'
          containerButton.classList.remove('current-tab')
        }
      }
      if (id === 'playback') {
        left.style.display = ''
        right.style.width = ''
      } else {
        left.style.display = 'none'
        right.style.width = '100%'
      }
      return window.dispatchEvent(new window.CustomEvent('refresh'))
    })
  }
  let first = true
  for (const containerid of containers) {
    const container = document.querySelector(`.${containerid}-container`)
    if (!container) {
      continue
    }
    container.style.display = first ? 'block' : 'none'
    first = false
  }
}




let tagsTable

window.setupTags = () => {
  tagsTable = document.querySelector('.tags-table')
  if (!tagsTable) {
    return
  }
  while (tagsTable.rows.length > 1) {
    tagsTable.deleteRow(1)
  }
  const tags = Object.keys(window.pgn.tags)
  for (const tag of tags) {
    createTagRow(tag)
  }
  const addButton = document.querySelector('.add-tag-button')
  addButton.onclick = () => {
    const nameInput = document.querySelector('.new-tag-name')
    const name = nameInput.value
    if (!name || !name.length) {
      return
    }
    const valueInput = document.querySelector('.new-tag-value')
    const value = valueInput.value
    if (!value || !value.length) {
      return
    }
    // tag already exists
    if (window.pgn.tags[name]) {
      return
    }
    // add tag
    nameInput.value = ''
    valueInput.value = ''
    window.pgn.tags[name] = value
    createTagRow(name, true)
    return regeneratePGNHeader()
  }
  const tagsContainer = document.querySelector('.tags-container')
  if (document.body.offsetHeight > document.body.offsetWidth) {
    tagsContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight) + 'px'
  } else {
    tagsContainer.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight) + 'px'
  }
  tagsContainer.style.overflow = 'scroll'
}

function regeneratePGNHeader () {
  window.pgn.tags = {}
  for (const row of tagsTable.rows) {
    if (row.className !== 'tag-row') {
      continue
    }
    const name = row.cells[0].firstChild.value
    const value = row.cells[1].firstChild.value
    window.pgn.tags[name] = value
  }
  return window.dispatchEvent(new window.CustomEvent('refresh'))
}

function createTagRow (tag, last) {
  const row = tagsTable.insertRow(1)
  row.className = 'tag-row'
  const nameCell = row.insertCell(0)
  nameCell.className = 'tag-name'
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.value = tag
  nameInput.className = 'tag-input'
  nameInput.onchange = nameInput.onkeyup = regeneratePGNHeader
  nameCell.appendChild(nameInput)
  const valueCell = row.insertCell(1)
  valueCell.className = 'tag-value'
  const valueInput = document.createElement('input')
  valueInput.type = 'text'
  valueInput.className = 'tag-input'
  valueInput.value = window.pgn.tags[tag]
  valueInput.onchange = nameInput.onkeyup = regeneratePGNHeader
  valueCell.appendChild(valueInput)
  const buttonCell = row.insertCell(2)
  const deleteButton = document.createElement('button')
  deleteButton.className = 'tag-button delete-tag-button'
  deleteButton.title = 'Delete this tag'
  deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>'
  deleteButton.onclick = (event) => {
    const deleteRow = event.target.parentNode.parentNode
    deleteRow.parentNode.removeChild(deleteRow)
    return regeneratePGNHeader()
  }
  buttonCell.appendChild(deleteButton)
}




;; ((exports) => {
  exports.addColumn = addColumn
  exports.addColumnAndRow = addColumnAndRow
  exports.addRow = addRow
  exports.calculatePieceMovement = calculatePieceMovement
  exports.cleanSpacing = cleanSpacing
  exports.createTurnObject = createTurnObject
  exports.extractNextLine = extractNextLine
  exports.findClosingBracket = findClosingBracket
  exports.findCoordinates = findCoordinates
  exports.tokenizeLine = tokenizeLine
  exports.tokenizeLines = tokenizeLines
  exports.parse = parse
  exports.parseRecursively = parseRecursively
  exports.parseTags = parseTags
  exports.parseTurn = parseTurn
  exports.parseTurns = parseTurns
  exports.processTurn = processTurn
  exports.nextCoordinateUpLeft = nextCoordinateUpLeft
  exports.nextCoordinateUpRight = nextCoordinateUpRight
  exports.nextCoordinateDownLeft = nextCoordinateDownLeft
  exports.nextCoordinateDownRight = nextCoordinateDownRight
  exports.nextCoordinateUp = nextCoordinateUp
  exports.nextCoordinateDown = nextCoordinateDown
  exports.nextCoordinateLeft = nextCoordinateLeft
  exports.nextCoordinateRight = nextCoordinateRight

  const knightMoveDirections = {
    upLeft: [nextCoordinateUp, nextCoordinateUp, nextCoordinateLeft],
    upRight: [nextCoordinateUp, nextCoordinateUp, nextCoordinateRight],
    downLeft: [nextCoordinateDown, nextCoordinateDown, nextCoordinateLeft],
    downRight: [nextCoordinateDown, nextCoordinateDown, nextCoordinateRight],
    leftUp: [nextCoordinateLeft, nextCoordinateLeft, nextCoordinateUp],
    leftDown: [nextCoordinateLeft, nextCoordinateLeft, nextCoordinateDown],
    rightUp: [nextCoordinateRight, nextCoordinateRight, nextCoordinateUp],
    rightDown: [nextCoordinateRight, nextCoordinateRight, nextCoordinateDown]
  }
  const kingMoveDirections = [nextCoordinateUp, nextCoordinateDown, nextCoordinateLeft, nextCoordinateRight, nextCoordinateUpLeft, nextCoordinateUpRight, nextCoordinateDownLeft, nextCoordinateDownRight]
  const queenMoveDirections = [nextCoordinateUp, nextCoordinateDown, nextCoordinateLeft, nextCoordinateRight, nextCoordinateUpLeft, nextCoordinateUpRight, nextCoordinateDownLeft, nextCoordinateDownRight]
  const bishopMoveDirections = [nextCoordinateUpLeft, nextCoordinateUpRight, nextCoordinateDownLeft, nextCoordinateDownRight]
  const rookMoveDirections = [nextCoordinateUp, nextCoordinateDown, nextCoordinateLeft, nextCoordinateRight]
  const defaultPieces = JSON.stringify([
    { type: 'R', color: 'b', start: 'a8', coordinate: 'a8', image: 'bR.png' },
    { type: 'N', color: 'b', start: 'b8', coordinate: 'b8', image: 'bN.png' },
    { type: 'B', color: 'b', start: 'c8', coordinate: 'c8', image: 'bB.png' },
    { type: 'Q', color: 'b', start: 'd8', coordinate: 'd8', image: 'bQ.png' },
    { type: 'K', color: 'b', start: 'e8', coordinate: 'e8', image: 'bK.png' },
    { type: 'B', color: 'b', start: 'f8', coordinate: 'f8', image: 'bB.png' },
    { type: 'N', color: 'b', start: 'g8', coordinate: 'g8', image: 'bN.png' },
    { type: 'R', color: 'b', start: 'h8', coordinate: 'h8', image: 'bR.png' },
    { type: 'P', color: 'b', start: 'a7', coordinate: 'a7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'b7', coordinate: 'b7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'c7', coordinate: 'c7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'd7', coordinate: 'd7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'e7', coordinate: 'e7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'f7', coordinate: 'f7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'g7', coordinate: 'g7', image: 'bP.png' },
    { type: 'P', color: 'b', start: 'h7', coordinate: 'h7', image: 'bP.png' },
    { type: 'P', color: 'w', start: 'a2', coordinate: 'a2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'b2', coordinate: 'b2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'c2', coordinate: 'c2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'd2', coordinate: 'd2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'e2', coordinate: 'e2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'f2', coordinate: 'f2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'g2', coordinate: 'g2', image: 'oP.png' },
    { type: 'P', color: 'w', start: 'h2', coordinate: 'h2', image: 'oP.png' },
    { type: 'R', color: 'w', start: 'a1', coordinate: 'a1', image: 'oR.png' },
    { type: 'N', color: 'w', start: 'b1', coordinate: 'b1', image: 'oN.png' },
    { type: 'B', color: 'w', start: 'c1', coordinate: 'c1', image: 'oB.png' },
    { type: 'Q', color: 'w', start: 'd1', coordinate: 'd1', image: 'oQ.png' },
    { type: 'K', color: 'w', start: 'e1', coordinate: 'e1', image: 'oK.png' },
    { type: 'B', color: 'w', start: 'f1', coordinate: 'f1', image: 'oB.png' },
    { type: 'N', color: 'w', start: 'g1', coordinate: 'g1', image: 'oN.png' },
    { type: 'R', color: 'w', start: 'h1', coordinate: 'h1', image: 'oR.png' }
  ])

  /*
   * parses a PGN file of text and recursively extracts all of the turns and
   * and their descriptors and creates an object representation
  */
  function parse (pgn) {
    const tags = parseTags(pgn)
    const moveData = tokenizeLines(pgn)
    const turns = parseRecursively(moveData)
    let pieces
    if (tags.FEN && tags.SetUp === '1') {
      pieces = toPieces(tags.FEN)
    } else {
      pieces = JSON.parse(defaultPieces)
    }
    const startingFEN = tags.FEN || toFen(pieces)
    for (const turn of turns) {
      processTurn(turn, turns, pieces)
    }
    const pgnData = {
      FEN: startingFEN,
      tags,
      turns,
      toString: () => {
        const tagText = []
        const tagKeys = Object.keys(pgnData.tags)
        for (const tag of tagKeys) {
          tagText.push(`[${tag} "${pgnData.tags[tag]}"]`)
        }
        const moveText = []
        for (const turn of turns) {
          moveText.push(turn.sequence.join(' '))
        }
        return `${tagText.join('\n')}\n\n${cleanSpacing(moveText.join(' '))}`
      }
    }
    return pgnData
  }

  /*
   * recursively parses the turns from a block of PGN-text
   * that has been truncated to exclude tags, the board
   * state for each turn is progressively determined
  */
  function parseRecursively (pgnData, results) {
    const turns = parseTurns(pgnData)
    results = results || []
    for (const turn of turns) {
      results.push(turn)
      for (const item of turn.sequence) {
        if (!item.startsWith('(')) {
          continue
        }
        const itemLines = tokenizeLines(item.substring(1, item.length - 1))
        const siblingTurns = parseRecursively(itemLines)
        turn.siblings = turn.siblings || []
        turn.siblings.push(siblingTurns)
        for (const nestedTurn of siblingTurns) {
          nestedTurn.parentTurn = turn
          nestedTurn.parentTurns = results
        }
      }
    }
    return results
  }

  /*
   * receives a turn and array of pieces and applies the turn
   * then returns the modified array of pieces
   */
  function processTurn (turn, turns, pieces) {
    for (const piece of pieces) {
      delete (piece.coordinateBefore)
      delete (piece.moveSteps)
    }
    const previousPieces = JSON.stringify(pieces)
    if (turn.queenSideCastling || turn.kingSideCastling) {
      const moveKingAmount = turn.queenSideCastling ? -2 : 2
      const moveRookAmount = turn.queenSideCastling ? 3 : -2
      const rookColumn = turn.queenSideCastling ? 'a' : 'h'
      if (turn.color === 'w') {
        const whiteKing = pieces.filter(obj => obj.type === 'K' && obj.color === 'w').pop()
        whiteKing.coordinateBefore = whiteKing.coordinate
        whiteKing.coordinate = addColumn(whiteKing.coordinate, moveKingAmount)
        whiteKing.moveSteps = [whiteKing.coordinateBefore, whiteKing.coordinate]
        const whiteQueenSideRook = pieces.filter(obj => obj.type === 'R' && obj.start.startsWith(rookColumn) && obj.color === 'w').pop()
        whiteQueenSideRook.coordinateBefore = whiteQueenSideRook.coordinate
        whiteQueenSideRook.coordinate = addColumn(whiteQueenSideRook.coordinate, moveRookAmount)
        whiteQueenSideRook.moveSteps = [whiteQueenSideRook.coordinateBefore, whiteQueenSideRook.coordinate]
      } else {
        const blackKing = pieces.filter(obj => obj.type === 'K' && obj.color === 'b').pop()
        blackKing.coordinateBefore = blackKing.coordinate
        blackKing.coordinate = addColumn(blackKing.coordinate, moveKingAmount)
        blackKing.moveSteps = [blackKing.coordinateBefore, blackKing.coordinate]
        const blackQueenSideRook = pieces.filter(obj => obj.type === 'R' && obj.start.startsWith(rookColumn) && obj.color === 'b').pop()
        blackQueenSideRook.coordinateBefore = blackQueenSideRook.coordinate
        blackQueenSideRook.coordinate = addColumn(blackQueenSideRook.coordinate, moveRookAmount)
        blackQueenSideRook.moveSteps = [blackQueenSideRook.coordinateBefore, blackQueenSideRook.coordinate]
      }
    } else {
      const movingPiece = findMovingPiece(turn, pieces)
      movingPiece.coordinateBefore = movingPiece.coordinate
      movingPiece.coordinate = turn.to
      if (turn.promoted) {
        movingPiece.type = turn.promotedTo
      }
      if (turn.capturing) {
        for (const piece of pieces) {
          if (piece.coordinate === movingPiece.coordinate && piece !== movingPiece) {
            pieces.splice(pieces.indexOf(piece), 1)
            break
          }
        }
      }
    }
    if (turn.siblings && turn.siblings.length) {
      for (const sibling of turn.siblings) {
        const piecesFork = JSON.parse(previousPieces)
        for (const turn of sibling) {
          processTurn(turn, turns, piecesFork)
        }
      }
    }
    turn.previousPieces = JSON.parse(previousPieces)
    turn.pieces = JSON.parse(JSON.stringify(pieces))
    turn.fen = toFen(pieces, turn, turns)
  }

  function toPieces (fen) {
    // TODO: convert starting FEN to piece array
  }

  function toFen (pieces, turn, turns) {
    const board = [
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '']
    ]
    for (const piece of pieces) {
      const row = piece.coordinate.substring(1)
      const rowIndex = '87654321'.indexOf(row)
      const column = piece.coordinate.substring(0, 1)
      const columnIndex = 'abcdefgh'.indexOf(column)
      board[rowIndex][columnIndex] = `${piece.color}${piece.type}`
    }
    let result = ''
    for (let y = 0; y < board.length; y++) {
      let empty = 0
      for (let x = 0; x < board[y].length; x++) {
        const c = board[y][x][0]
        if (c === 'w' || c === 'b') {
          if (empty > 0) {
            result += empty.toString()
            empty = 0
          }
          if (c === 'w') {
            result += board[y][x][1].toUpperCase()
          } else {
            result += board[y][x][1].toLowerCase()
          }
        } else {
          empty += 1
        }
      }
      if (empty > 0) {
        result += empty.toString()
      }
      if (y < board.length - 1) {
        result += '/'
      }
    }
    if (!turn) {
      return `${result} w KQkq - 0 1`
    }
    const halfTurns = halfTurnCount(turn, turns)
    const castling = fenCastling(pieces)
    const enPassant = fenEnPassant(pieces)
    result += ` ${turn.color} ${castling} ${enPassant} ${halfTurns} ${turn.moveNumber}`
    return result
  }

  function halfTurnCount (currentTurn, turns) {
    let count = 0
    for (const turn of turns) {
      if (turn === currentTurn) {
        return count
      }
      if (turn.capturing) {
        count = 0
        continue
      }
      if (turn.type === 'P') {
        count = 0
        continue
      }
      count++
    }
    // return the number of turns since a capture or a pawn advanced
    return 0
  }

  function fenEnPassant (pieces) {
    for (const piece of pieces) {
      if (piece.type !== 'P' || !piece.coordinateBefore || piece.moveSteps.length !== 3) {
        continue
      }
      return piece.moveSteps[1]
    }
    return '-'
  }

  function fenCastling (pieces) {
    const whiteKing = pieces.filter(piece => piece.type === 'K' && piece.color === 'w' && piece.coordinate === piece.start)
    const whiteKingSideRook = pieces.filter(piece => piece.type === 'R' && piece.color === 'w' && piece.coordinate === piece.start && piece.start === 'h1')
    const whiteQueenSideRook = pieces.filter(piece => piece.type === 'R' && piece.color === 'w' && piece.coordinate === piece.start && piece.start === 'a1')
    const blackKing = pieces.filter(piece => piece.type === 'K' && piece.color === 'b' && piece.coordinate === piece.start)
    const blackKingSideRook = pieces.filter(piece => piece.type === 'R' && piece.color === 'b' && piece.coordinate === piece.start && piece.start === 'h8')
    const blackQueenSideRook = pieces.filter(piece => piece.type === 'R' && piece.color === 'b' && piece.coordinate === piece.start && piece.start === 'a8')
    const parts = []
    if (whiteKing.length && whiteKingSideRook.length) {
      parts.push('K')
    }
    if (whiteKing.length && whiteQueenSideRook.length) {
      parts.push('Q')
    }
    if (blackKing.length && blackKingSideRook.length) {
      parts.push('k')
    }
    if (blackKing.length && blackQueenSideRook.length) {
      parts.push('q')
    }
    if (!parts.length) {
      return '-'
    }
    return parts.join('')
  }

  function parseTurns (lines) {
    const moves = []
    for (const line of lines) {
      const turn = parseTurn(line)
      for (const move of turn) {
        moves.push(move)
      }
    }
    return moves
  }

  /**
   * formats PGN for consistent spacing especially around brackets
   */
  function cleanSpacing (text) {
    text = text.split('\n').join(' ')
    const doubleSpacing = [
      { single: ' ', double: '  ' },
      { single: '{', double: '{ ' },
      { single: '(', double: '( ' },
      { single: '[', double: '[ ' },
      { single: '}', double: ' }' },
      { single: ')', double: ' )' },
      { single: ']', double: ' ]' }
    ]
    for (const spacing of doubleSpacing) {
      while (text.indexOf(spacing.double) > -1) {
        text = text.split(spacing.double).join(spacing.single)
      }
    }
    for (let i = 1, len = 150; i < len; i++) {
      if (text.indexOf(i.toString()) === -1) {
        continue
      }
      text = text.split(`${i}. `).join(`${i}.`)
      text = text.split(`${i}... `).join(`${i}...`)
      text = text.split(`${i}.{`).join(`${i}. {`)
      text = text.split(`${i}...{`).join(`${i}... {`)
    }
    return text.trim()
  }

  /*
    * parses PGN until it is reduced to an array of moves each
    * consisting of a pair or a single turn
    *
    * [
    *   '1. a5 {[%csl a5]} b7',
    *   '2. f3 (2. d4 {an annotated turn})',
    *   '2... a6',
    *   '{prepended annotation} 3. f7'
    * ]
    */
  function tokenizeLines (pgnFileData) {
    const movesDataStart = pgnFileData.indexOf(']\n\n') + 1
    let rawMoveData = movesDataStart > 0 ? pgnFileData.substring(movesDataStart) : pgnFileData
    rawMoveData = cleanSpacing(rawMoveData)
    const tokens = []
    while (rawMoveData.length) {
      const line = extractNextLine(rawMoveData)
      rawMoveData = rawMoveData.substring(line.length + 1)
      if (line) {
        tokens.push(line.trim())
      }
    }
    if (tokens[0].startsWith('$')) {
      const first = tokens.shift()
      tokens[0] = `${first} ${tokens[0]}`
    }
    return tokens
  }

  /*
    * parses a turn line of PGN that may include coordinates
    * and annotations, nags, highlights or nested moves and
    * have moves for one or both players
    *
    *   '1. a5 {[%csl a5]} b7',
    *    [ '1.', 'a5', '{[%csl a5]}', 'b7' ]
    *
    *   '2.f3 (2. d4 {an annotated turn})',
    *    [ 'f3', '(2. d4 {an annotated turn})' ]
    *   '2... a6'
    *    [ '2...', 'a6' ]
    *
    *   '$0 3... a6'
    *    [ '$0', '3...', 'a6 ]
    */
  function tokenizeLine (lineData) {
    const parts = lineData.split(' ')
    const line = []
    let index = 0
    while (index < parts.length) {
      const part = parts[index]
      if (part.indexOf('(') > -1 || part.indexOf('{') > -1 || part.indexOf('[') > -1) {
        const closingIndex = findClosingBracket(index, parts)
        line.push(parts.slice(index, closingIndex).join(' '))
        index = closingIndex
        continue
      }
      const tripleDotIndex = part.indexOf('...')
      if (tripleDotIndex > -1) {
        const moveNumber = part.substring(0, tripleDotIndex)
        let moveInt
        try {
          moveInt = parseInt(moveNumber, 10)
        } catch (error) {
        }
        if (moveInt.toString() === moveNumber) {
          line.push(`${moveNumber}...`)
          if (part.length > `${moveNumber}...`.length) {
            line.push(part.substring(`${moveNumber}...`.length))
          }
          index++
          continue
        }
      }
      const dotIndex = part.indexOf('.')
      if (dotIndex > -1) {
        const moveNumber = part.substring(0, dotIndex)
        let moveInt
        try {
          moveInt = parseInt(moveNumber, 10)
        } catch (error) {
        }
        if (moveInt.toString() === moveNumber) {
          line.push(`${moveNumber}.`)
          if (part.length > `${moveNumber}.`.length) {
            line.push(part.substring(`${moveNumber}.`.length))
          }
          index++
          continue
        }
      }
      line.push(part)
      index++
    }
    return line
  }

  /**
   * extracts the next move from the PGN including any nested
   * moves within (), the end result is a line like:
   *
   * 1. e4 [ %cal Ra1b2 ] e5
   */
  function extractNextLine (moveText) {
    const parts = moveText.split(' ')
    const line = []
    let index = 0
    let annotated
    let moveNumber
    while (index < parts.length) {
      const part = parts[index]
      if (part.indexOf('(') === 0 || part.indexOf('{') === 0 || part.indexOf('[') === 0) {
        const closingIndex = findClosingBracket(index, parts)
        line.push(parts.slice(index, closingIndex).join(' '))
        index = closingIndex
        annotated = true
        continue
      }
      const dotIndex = part.indexOf('.')
      if (dotIndex > 0 && dotIndex < 4) {
        moveNumber = part.substring(0, dotIndex)
        let moveInt
        try {
          moveInt = parseInt(moveNumber, 10)
        } catch (error) {
        }
        if (moveInt.toString() === moveNumber && ((line.length > 1 && annotated) || (line.length && !annotated))) {
          break
        }
      }
      line.push(part)
      index++
    }
    return line.join(' ').replace(`${moveNumber}. `, `${moveNumber}.`).replace(`${moveNumber}... `, `${moveNumber}...`)
  }

  /**
   * parses the moves from a string
   */
  function parseTurn (line) {
    const lineParts = tokenizeLine(line)
    let moveNumber, numberPart
    for (const part of lineParts) {
      if (part.indexOf('.') === -1) {
        continue
      }
      moveNumber = part.substring(0, part.indexOf('.'))
      try {
        if (parseInt(moveNumber, 10).toString() === moveNumber) {
          numberPart = part
          break
        }
      } catch (error) {
      }
    }
    const coordinates = findCoordinates(lineParts)
    let color
    const moves = []
    if (coordinates.first) {
      color = numberPart === `${moveNumber}...` ? 'b' : 'w'
      const sequence = lineParts.slice(0, coordinates.secondIndex || lineParts.length)
      const pgn = line.substring(0, coordinates.second ? line.indexOf(coordinates.second) : line.length)
      moves.push(createTurnObject(color, moveNumber, coordinates.first, sequence, pgn))
    }
    if (coordinates.second) {
      color = color === 'w' ? 'b' : 'w'
      const sequence = lineParts.slice(coordinates.secondIndex)
      const pgn = line.substring(line.indexOf(coordinates.second))
      moves.push(createTurnObject(color, moveNumber, coordinates.second, sequence, pgn))
    }
    return moves
  }

  /**
   * Creates an object holding turn data and any flags that are described
   * in the PGN file, like whether the move results in check or if there
   * is a column specified with the coordinate to disambiguate pieces
   * @param {*} color
   * @param {*} moveNumber
   * @param {*} to
   * @param {*} sequence
   * @param {*} pgn
   * @returns
   */
  function createTurnObject (color, moveNumber, to, sequence, pgn) {
    let type
    const firstCharacter = to.charAt(0)
    if ('KQBRNP'.indexOf(firstCharacter) > -1) {
      type = firstCharacter
      to = to.substring(1)
    }
    type = type || 'P'
    const queenSideCastling = to.indexOf('O-O-O') > -1
    if (queenSideCastling) {
      to = to.replace('O-O-O', '')
    }
    const kingSideCastling = to.indexOf('O-O') > -1
    if (kingSideCastling) {
      to = to.replace('O-O', '')
    }
    const capturing = to.indexOf('x') > -1
    if (capturing) {
      to = to.replace('x', '')
    }
    const check = to.indexOf('+') > -1
    if (check) {
      to = to.replace('+', '')
    }
    const checkMate = to.indexOf('#') > -1
    if (checkMate) {
      to = to.replace('#', '')
    }
    let promoted = to.indexOf('=')
    let promotedTo
    if (promoted > -1) {
      promotedTo = to.substring(promoted + 1)
      promotedTo = promotedTo || 'Q'
      to = to.substring(0, promoted)
      promoted = true
    } else {
      promoted = undefined
      promotedTo = undefined
    }
    let requireRow, requireColumn
    if (to.length > 2) {
      const firstCharacter = to.charAt(0)
      if ('abcdefgh'.indexOf(firstCharacter) > -1) {
        requireColumn = firstCharacter
        to = to.substring(1)
      } else if ('12345678'.indexOf(firstCharacter) > -1) {
        requireRow = firstCharacter
        to = to.substring(1)
      }
    }
    const move = {
      type,
      color,
      moveNumber,
      to,
      requireRow,
      requireColumn,
      sequence,
      pgn,
      queenSideCastling,
      kingSideCastling,
      capturing,
      check,
      checkMate,
      promoted,
      promotedTo
    }
    for (const key in move) {
      if (move[key] === false || move[key] === undefined) {
        delete (move[key])
      }
    }
    return move
  }

  /**
   * Recieves a tokenized array of PGN for a turn and identifies where the
   * coordinates are, which may be white-then-black or a single move.
   * eg '1.|e5|{a notes}|$3|Nxc7|$4|{another note}
   * returns {
   *  first: e5
   *  firstIndex: 3,
   *  second: Nxc7
   *  secondIndex: 19
   * }
   * @param {} lineArray
   * @returns
   */
  function findCoordinates (lineArray) {
    let first, firstIndex, second, secondIndex
    for (const index in lineArray) {
      const part = lineArray[index]
      if (part.startsWith('(') || part.startsWith('[') || part.startsWith('{')) {
        continue
      }
      if (part.startsWith('$')) {
        continue
      }
      if (part.indexOf('*') > -1 || part.indexOf('/') > -1 || part.indexOf('.') > -1) {
        continue
      }
      if (part.indexOf('O-O') === -1 && part.indexOf('-') > -1) {
        continue
      }
      if (!first) {
        first = part
        firstIndex = parseInt(index, 10)
      } else {
        second = part
        secondIndex = parseInt(index, 10)
      }
    }
    return {
      first,
      firstIndex,
      second,
      secondIndex
    }
  }

  /*
  * Finds the ending of a { or ( or [ text block from an array of PGN
  * that has been split by spaces (but not tokenized, this is part of the
  * raw PGN processing that creates the tokenized version)
  */
  function findClosingBracket (index, array) {
    let openParantheses = 0
    let openSquare = 0
    let openBrace = 0
    const bracket = array[index].charAt(0)
    let finish = index
    while (finish < array.length) {
      let part = '' + array[finish]
      if (bracket === '(') {
        while (part.indexOf('(') > -1) {
          openParantheses++
          part = part.replace('(', '')
        }
        while (part.indexOf(')') > -1) {
          openParantheses--
          part = part.replace(')', '')
        }
      } else if (bracket === '{') {
        while (part.indexOf('{') > -1) {
          openBrace++
          part = part.replace('{', '')
        }
        while (part.indexOf('}') > -1) {
          openBrace--
          part = part.replace('}', '')
        }
      } else if (bracket === '[') {
        while (part.indexOf('[') > -1) {
          openSquare++
          part = part.replace('[', '')
        }
        while (part.indexOf(']') > -1) {
          openSquare--
          part = part.replace(']', '')
        }
      }
      if (!openParantheses && !openSquare && !openBrace) {
        return finish + 1
      }
      finish++
    }
    return finish
  }

  /**
   * PGN tags are specified with enclosed [] and there may
   * be any number of them before the move text
   * eg:
   * [name "value"]
   */
  function parseTags (pgnFileData) {
    const tags = {}
    let blank = false
    for (const line of pgnFileData.split('\n')) {
      if (!line.startsWith('[')) {
        if (blank) {
          break
        }
        blank = true
        continue
      }
      const lineParts = line.split(' ')
      const field = lineParts[0].substring(1)
      const valueParts = lineParts.slice(1).join(' ')
      const value = valueParts.substring(1, valueParts.lastIndexOf('"'))
      tags[field] = value
    }
    return tags
  }

  /**
   * identifies the moving piece based on the pieces that have a valid option
   * to move to the target coordinate and matching any criteria noted in the PGN
   */
  function findMovingPiece (move, pieces) {
    for (const piece of pieces) {
      if (move.type && move.type !== piece.type) {
        continue
      }
      if (move.color !== piece.color) {
        continue
      }
      if (move.requireColumn && !piece.coordinate.startsWith(move.requireColumn)) {
        continue
      }
      if (move.requireRow && !piece.coordinate.endsWith(move.requireRow)) {
        continue
      }
      const moves = calculatePieceMovement(piece, move, pieces)
      if (!moves || !moves.length || moves.indexOf(move.to) === -1) {
        continue
      }
      piece.moveSteps = moves
      return piece
    }
    throw new Error('could not determine piece for coordinate "' + move.to + '"')
  }

  function calculatePieceMovement (piece, move, pieces) {
    if (piece.type === 'N') {
      for (const knightJumpDirection in knightMoveDirections) {
        const knightMoves = [piece.coordinate]
        const stepList = knightMoveDirections[knightJumpDirection]
        let coordinate = piece.coordinate
        for (const step of stepList) {
          coordinate = step(coordinate)
          if (!coordinate) {
            break
          }
          knightMoves.push(coordinate)
        }
        if (!coordinate) {
          continue
        }
        const blockingPiece = checkObstructed(coordinate, pieces)
        if (blockingPiece && !(move.capturing || blockingPiece.color === piece.color)) {
          coordinate = false
        }
        if (move.to === coordinate) {
          return knightMoves
        }
      }
      return
    }
    if (piece.type === 'P') {
      const nextPawnCoordinate = piece.color === 'w' ? nextCoordinateUp : nextCoordinateDown
      if (move.capturing) {
        const nextValue = nextPawnCoordinate(piece.coordinate)
        const captureLeft = addColumn(nextValue, -1)
        if (move.to === captureLeft) {
          const captureLeftPiece = checkObstructed(captureLeft, pieces)
          if (captureLeftPiece && captureLeftPiece.color !== piece.color) {
            return [piece.coordinate, captureLeft]
          }
          if (piece.color === 'w') {
            const enPassantCoordinate = addRow(move.to, -1)
            if (enPassantCoordinate) {
              const downPiece = checkObstructed(enPassantCoordinate, pieces)
              if (downPiece && downPiece.type === 'P' && downPiece.color !== piece.color) {
                return [piece.coordinate, captureLeft]
              }
            }
          } else if (piece.color === 'b') {
            const enPassantCoordinate = addRow(move.to, +1)
            if (enPassantCoordinate) {
              const upPiece = checkObstructed(enPassantCoordinate, pieces)
              if (upPiece && upPiece.type === 'P' && upPiece.color !== piece.color) {
                return [piece.coordinate, captureLeft]
              }
            }
          }
        }
        const captureRight = addColumn(nextValue)
        if (move.to === captureRight) {
          const captureRightPiece = checkObstructed(captureRight, pieces)
          if (captureRightPiece && captureRightPiece.color !== piece.color) {
            return [piece.coordinate, captureRight]
          }
          if (piece.color === 'w') {
            const enPassantCoordinate = addRow(move.to, -1)
            if (enPassantCoordinate) {
              const downPiece = checkObstructed(enPassantCoordinate, pieces)
              if (downPiece && downPiece.type === 'P' && downPiece.color !== piece.color) {
                return [piece.coordinate, captureRight]
              }
            }
          } else if (piece.color === 'b') {
            const enPassantCoordinate = addRow(move.to, +1)
            if (enPassantCoordinate) {
              const upPiece = checkObstructed(enPassantCoordinate, pieces)
              if (upPiece && upPiece.type === 'P' && upPiece.color !== piece.color) {
                return [piece.coordinate, captureRight]
              }
            }
          }
        }
      } else if (piece.coordinate === piece.start) {
        const firstJump = nextPawnCoordinate(piece.coordinate)
        if (firstJump) {
          if (firstJump === move.to) {
            return [piece.coordinate, firstJump]
          }
          const obstructed = checkObstructed(firstJump, pieces)
          if (obstructed) {
            return
          }
          const secondJump = nextPawnCoordinate(firstJump)
          if (secondJump === move.to) {
            return [piece.coordinate, firstJump, secondJump]
          }
          const obstructed2 = checkObstructed(secondJump, pieces)
          if (obstructed2) {
            return [piece.coordinate, firstJump]
          }
        }
      } else {
        const oneJump = nextPawnCoordinate(piece.coordinate)
        if (oneJump === move.to) {
          return [piece.coordinate, oneJump]
        }
      }
      return
    }
    if (piece.type === 'K') {
      for (const moveDirectionMethod of kingMoveDirections) {
        const nextCoordinate = moveDirectionMethod(piece.coordinate)
        if (nextCoordinate === move.to) {
          const capturePiece = checkObstructed(nextCoordinate, pieces)
          if (!capturePiece || (move.capturing && capturePiece.color !== piece.color)) {
            return [piece.coordinate, nextCoordinate]
          }
        }
      }
      return
    }
    let moveUntilEndDirections
    switch (piece.type) {
      case 'R':
        moveUntilEndDirections = rookMoveDirections
        break
      case 'B':
        moveUntilEndDirections = bishopMoveDirections
        break
      case 'Q':
        moveUntilEndDirections = queenMoveDirections
        break
    }
    for (const moveDirectionMethod of moveUntilEndDirections) {
      const moves = moveAllPossibleSpaces(moveDirectionMethod, piece, pieces, move)
      if (moves && moves.length && moves.indexOf(move.to) > -1) {
        return moves
      }
    }
  }

  /**
   * checks the pieces array to see if anything occupies a coordinate
   */
  function checkObstructed (coordinate, pieces) {
    for (const piece of pieces) {
      if (piece.coordinate === coordinate) {
        return piece
      }
    }
  }

  function moveAllPossibleSpaces (moveMethod, piece, pieces, move) {
    const moves = [piece.coordinate]
    let nextValue = piece.coordinate
    while (nextValue) {
      nextValue = moveMethod(nextValue)
      if (nextValue) {
        const blockingPiece = checkObstructed(nextValue, pieces)
        if (blockingPiece && (!move.capturing || blockingPiece.color === piece.color)) {
          nextValue = false
        } else {
          moves.push(nextValue)
          if (nextValue === move.to) {
            return moves
          }
        }
      }
    }
    if (moves.length > 1) {
      return moves
    }
  }

  /**
   * calculates the coordinate up left
   */
  function nextCoordinateUpLeft (coordinate) {
    return addColumnAndRow(coordinate, -1, 1)
  }

  /**
   * calculates the coordinate up right
   */
  function nextCoordinateUpRight (coordinate) {
    return addColumnAndRow(coordinate, 1, 1)
  }

  /**
   * calculates the coordinate down left
   */
  function nextCoordinateDownLeft (coordinate) {
    return addColumnAndRow(coordinate, -1, -1)
  }

  /**
   * calculates the coordinate down right
   */
  function nextCoordinateDownRight (coordinate) {
    return addColumnAndRow(coordinate, 1, -1)
  }

  /**
   * calculates the coordinate up
   */
  function nextCoordinateUp (coordinate) {
    return addRow(coordinate, 1)
  }

  /**
   * calculates the coordinate down
   */
  function nextCoordinateDown (coordinate) {
    return addRow(coordinate, -1)
  }

  /**
   * calculates the coordinate left
   */
  function nextCoordinateLeft (coordinate) {
    return addColumn(coordinate, -1)
  }

  /**
   * calculates the coordinate right
   */
  function nextCoordinateRight (coordinate) {
    return addColumn(coordinate, 1)
  }

  /**
   * Adds +/- row to a coordinate if possible
   * @returns coordinate or undefined
   */
  function addColumnAndRow (coordinate, columnAmount, rowAmount) {
    let nextCoordinate = coordinate
    if (nextCoordinate && columnAmount && columnAmount !== 0) {
      nextCoordinate = addColumn(nextCoordinate, columnAmount)
    }
    if (nextCoordinate && rowAmount && rowAmount !== 0) {
      nextCoordinate = addRow(nextCoordinate, rowAmount)
    }
    if (nextCoordinate) {
      return nextCoordinate
    }
  }

  /**
   * Adds +/- row to a coordinate if possible
   * @returns coordinate or undefined
   */
  function addRow (coordinate, amount) {
    amount = amount || 1
    if (!coordinate) {
      return
    }
    const parts = coordinate.split('')
    const row = parseInt(parts[1], 10)
    if (row + amount < 1 || row + amount > 8) {
      return
    }
    return parts[0] + (row + amount)
  }

  /**
   * Adds +/- column to a coordinate if possible
   * @returns coordinate or undefined
   */
  function addColumn (coordinate, amount) {
    amount = amount || 1
    const parts = coordinate.split('')
    const columns = 'abcdefgh'
    const column = columns.indexOf(parts[0])
    if (column + amount < 0 || column + amount >= columns.length) {
      return
    }
    return columns[column + amount] + parts[1]
  }
})(typeof exports === 'undefined' ? this.parser = {} : exports)
