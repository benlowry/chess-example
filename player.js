let moveList

window.setupAnnotations = function () {
  moveList = document.querySelector('.move-list')
  const forms = document.querySelectorAll('.annotate-form')
  for (const form of forms) {
    form.style.display = 'none'
  }
}

window.refreshAnnotations = function () {
  if (!moveList) {
    return
  }
  moveList.innerHTML = ''
  if (document.body.offsetHeight > document.body.offsetWidth) {
    moveList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - document.querySelector('.left').offsetHeight) + 'px'
  } else {
    moveList.style.height = (document.body.offsetHeight - document.querySelector('.tabs-container').offsetHeight - 1) + 'px'
  }
  moveList.classList.add('timeline1')
  renderMoves(window.pgn.turns, moveList, 1)
}

function expandSequence (sequence) {
  const expanded = [' ']
  for (const item of sequence) {
    if (item.startsWith('{')) {
      const itemParts = item.substring(1, item.length - 1).split(']')
      expanded.push('{', ' ')
      for (const part of itemParts) {
        if (!part.length) {
          continue
        }
        if (part.startsWith('[')) {
          if (expanded[expanded.length - 1] === ' ') {
            expanded.push(`${part}]`, ' ')
          } else {
            expanded.push(' ', `${part}]`, ' ')
          }
        } else {
          expanded.push(part)
        }
      }
      if (expanded[expanded.length - 1] === ' ') {
        expanded.push('}', ' ')
      } else {
        expanded.push(' ', '}', ' ')
      }
      continue
    }
    expanded.push(item, ' ')
  }
  return expanded
}

function renderMoves (blocks, parent, timeline) {
  for (const move of blocks) {
    const li = document.createElement('li')
    li.moveIndex = move.move
    li.move = move
    li.className = 'move-list-item'
    const moveNumber = document.createElement('li')
    moveNumber.className = 'move-sequence-item'
    moveNumber.innerHTML = move.moveNumber + '.'
    const moveMenu = document.createElement('menu')
    moveMenu.className = 'annotate-menu'
    const addAnnotationButton = document.createElement('button')
    addAnnotationButton.className = 'button move-list-button'
    addAnnotationButton.innerHTML = '<i class="fas fa-plus"></i> Annotate'
    addAnnotationButton.annotateForm = 'annotation'
    addAnnotationButton.onclick = showAnnotateForm
    moveMenu.appendChild(addAnnotationButton)
    const addBranchButton = document.createElement('button')
    addBranchButton.className = 'button move-list-button'
    addBranchButton.innerHTML = '<i class="fas fa-plus"></i></span> Alternative moves'
    addBranchButton.title = 'Add alternative move'
    moveMenu.appendChild(addBranchButton)
    li.appendChild(moveMenu)
    const sequence = document.createElement('ul')
    sequence.className = 'move-sequence'
    sequence.appendChild(moveNumber)
    const expandedSequence = expandSequence(move.sequence)
    console.log('expanded sequence', move.pgn, expandedSequence)
    for (const i in expandedSequence) {
      const item = expandedSequence[i]
      const li = document.createElement('li')
      sequence.appendChild(li)
      if (item === ' ') {
        li.className = 'sequence-position-item'
        li.innerHTML = '<input type="radio" name="position" /><i class="fas fa-plus"></i>'
        li.onclick = selectPosition
        continue
      }
      li.className = 'move-sequence-item'
      if (item.startsWith('[')) {
        li.innerHTML = item.split(',').join(' ')
        continue
      }
      if (item.startsWith('$')) {
        li.innerHTML = item
        li.onclick = showEditNagForm
        continue
      }
      if (item.startsWith('{')) {
        li.innerHTML = item
        continue
      }
      if (item.startsWith('(')) {
        li.innerHTML = item.substring(0, 10) + '...)'
        li.title = item
        continue
      }
      li.innerHTML = item
    }
    li.appendChild(sequence)
    if (move.color === 'w') {
      li.classList.add('white-move-link')
    } else {
      li.classList.add('black-move-link')
    }
    if (move.siblings) {
      for (const sibling of move.siblings) {
        timeline++
        const ul = document.createElement('ul')
        ul.className = `move-list timeline${timeline}`
        li.appendChild(ul)
        timeline = renderMoves(sibling, ul, timeline)
        const branchOptions = document.createElement('li')
        branchOptions.className = 'branch-options'
        const addBranchButton = document.createElement('button')
        addBranchButton.className = 'button move-list-button'
        addBranchButton.innerHTML = '<i class="fas fa-plus"></i></span> Add move'
        addBranchButton.title = 'Add move'
        branchOptions.appendChild(addBranchButton)
        const deleteLastButton = document.createElement('button')
        deleteLastButton.className = 'button move-list-button'
        deleteLastButton.innerHTML = '<i class="fas fa-trash"></i></span> Delete last move'
        branchOptions.appendChild(deleteLastButton)
        const deleteBranchButton = document.createElement('button')
        deleteBranchButton.className = 'button move-list-button'
        deleteBranchButton.innerHTML = '<i class="fas fa-trash"></i></span> Delete branch'
        branchOptions.appendChild(deleteBranchButton)
        ul.appendChild(branchOptions)
      }
    }
    parent.appendChild(li)
  }
  return timeline
}

function selectPosition (event) {
  const positionList = event.target.parentNode
  for (const child of positionList.children) {
    if (child === event.target) {
      child.classList.add('selected-position')
    } else {
      child.classList.remove('selected-position')
    }
  }
}

function showAnnotateForm (event) {
  const annotateMenu = document.createElement('menu')
  annotateMenu.className = 'annotate-menu'
  const buttonMenu = event.target.parentNode
  buttonMenu.style.display = 'none'
  buttonMenu.parentNode.insertBefore(annotateMenu, buttonMenu)
  buttonMenu.parentNode.classList.add('show-positioning')
  const addNagButton = document.createElement('button')
  addNagButton.className = 'button annotate-button'
  addNagButton.innerHTML = '<i class="fas fa-dollar-sign"></i></span> Nag'
  addNagButton.onclick = showNagForm
  annotateMenu.appendChild(addNagButton)
  const addAnnotationButton = document.createElement('button')
  addAnnotationButton.className = 'button annotate-button'
  addAnnotationButton.innerHTML = '<i class="fas fa-pencil-alt"></i></span> Annotate'
  annotateMenu.appendChild(addAnnotationButton)
  const addArrowButton = document.createElement('button')
  addArrowButton.className = 'button annotate-button'
  addArrowButton.innerHTML = '<i class="fas fa-chess-board"></i></span> Highlight'
  annotateMenu.appendChild(addArrowButton)
  const cancelButton = document.createElement('button')
  cancelButton.className = 'button cancel-button'
  cancelButton.onclick = closeAnnotateForm
  cancelButton.innerHTML = '<i class="fas fa-window-close"></i></span> Cancel'
  annotateMenu.appendChild(cancelButton)
  return annotateMenu
}

function showNagForm (event) {
  const nagMenu = document.createElement('menu')
  nagMenu.className = 'annotate-menu'
  const annotateMenu = event.target.parentNode
  annotateMenu.parentNode.insertBefore(nagMenu, annotateMenu)
  annotateMenu.parentNode.removeChild(annotateMenu)
  const nagSelect = document.createElement('select')
  nagSelect.className = 'nag-select'
  nagSelect.innerHTML = document.importNode(document.getElementById('nag-index'), true).innerHTML
  nagMenu.appendChild(nagSelect)
  const saveButton = document.createElement('button')
  saveButton.className = 'button annotate-button'
  saveButton.innerHTML = '<i class="fas fa-plus"></i></span> Add'
  saveButton.onclick = addNag
  nagMenu.appendChild(saveButton)
  const cancelButton = document.createElement('button')
  cancelButton.className = 'button cancel-button'
  cancelButton.onclick = closeAnnotateForm
  cancelButton.innerHTML = '<i class="fas fa-window-close"></i></span> Cancel'
  nagMenu.appendChild(cancelButton)
  return nagMenu
}

function showEditNagForm (event) {
  const nagMenu = document.createElement('menu')
  nagMenu.className = 'annotate-menu'
  const annotateMenu = event.target.parentNode
  annotateMenu.parentNode.insertBefore(nagMenu, annotateMenu)
  annotateMenu.parentNode.removeChild(annotateMenu)
  const nagSelect = document.createElement('select')
  nagSelect.className = 'nag-select'
  nagSelect.innerHTML = document.importNode(document.getElementById('nag-index'), true).innerHTML
  nagMenu.appendChild(nagSelect)
  const saveButton = document.createElement('button')
  saveButton.className = 'button annotate-button'
  saveButton.innerHTML = '<i class="fas fa-plus"></i></span> Update'
  saveButton.onclick = updateNag
  nagMenu.appendChild(saveButton)
  const deleteButton = document.createElement('button')
  deleteButton.className = 'button annotate-button'
  deleteButton.innerHTML = '<i class="fas fa-trash"></i></span> Delete'
  deleteButton.onclick = deleteNag
  nagMenu.appendChild(deleteButton)
  const cancelButton = document.createElement('button')
  cancelButton.className = 'button cancel-button'
  cancelButton.onclick = closeAnnotateForm
  cancelButton.innerHTML = '<i class="fas fa-window-close"></i></span> Cancel'
  nagMenu.appendChild(cancelButton)
  return nagMenu
}

function addNag (event) {
  const nagMenu = event.target.parentNode
  const nag = nagMenu.firstChild.value
  let position = 0
  let selectedPosition
  for (const sibling of nagMenu.parentNode.children) {
    if (sibling.className !== 'move-sequence') {
      continue
    }
    for (const item of sibling.children) {
      if (item.classList.contains('move-sequence-item')) {
        continue
      }
      if (item.classList.contains('selected-position')) {
        selectedPosition = item
        break
      }
      position++
    }
    break
  }
  // add js object move
  const move = nagMenu.parentNode.move
  move.sequence.splice(position, 0, { type: 'nag', nag })
  // redraw move sequence
  const newSequenceItem = document.createElement('li')
  newSequenceItem.className = 'move-sequence-item'
  newSequenceItem.innerHTML = nag
  newSequenceItem.onclick = selectPosition
  selectedPosition.parentNode.insertBefore(newSequenceItem, selectedPosition)
  const newPositionItem = document.createElement('li')
  newPositionItem.className = 'sequence-position-item'
  newPositionItem.innerHTML = '<input type="radio" name="position" />'
  newPositionItem.onclick = selectPosition
  selectedPosition.parentNode.insertBefore(newPositionItem, selectedPosition)
  // replace in pgn raw
  let newPGN = move.pgn
  if (position === 0) {
    newPGN = `${nag} ${newPGN}`
  } else {
    const rightOfNag = move.sequence.length > position + 1 ? move.sequence[position + 1] : null
    if (rightOfNag && newPGN.indexOf(rightOfNag) > -1) {
      newPGN = newPGN.replace(rightOfNag, `${nag} ${rightOfNag}`)
    } else {
      const leftOfNag = move.sequence[position - 1].pgn
      if (newPGN.indexOf(leftOfNag) > -1) {
        newPGN = newPGN.replace(leftOfNag, `${leftOfNag} ${nag}`)
      }
    }
  }
  // window.pgnRaw = window.pgnRaw.replace(move.pgn, newPGN)
  return closeAnnotateForm(event)
}

function closeAnnotateForm (event) {
  const annotateMenu = event.target.parentNode
  const container = annotateMenu.parentNode
  container.removeChild(annotateMenu)
  const buttonMenu = container.firstChild
  buttonMenu.style.display = ''
  buttonMenu.parentNode.classList.remove('show-positioning')
}

function addPieceGlyph (text, color, type) {
  let compareText = text
  if (compareText.indexOf('{') > -1) {
    compareText = compareText.substring(0, compareText.indexOf('{'))
  }
  if (type === 'Q') {
    if (compareText.indexOf('Q') > -1) {
      return compareText.replace('Q', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-queen ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-queen ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'K') {
    if (compareText.indexOf('K') > -1) {
      return compareText.replace('K', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-king ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-king ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'B') {
    if (compareText.indexOf('B') > -1) {
      return compareText.replace('B', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-bishop ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-bishop ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'N') {
    if (compareText.indexOf('N') > -1) {
      return compareText.replace('N', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-knight ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-knight ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (type === 'R') {
    if (compareText.indexOf('R') > -1) {
      return compareText.replace('R', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-rook ${color}-piece-glyph piece-glyph"></i></span> `)
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-rook ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
  if (compareText.indexOf('P') > -1) {
    return compareText.replace('P', `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-pawn ${color}-piece-glyph piece-glyph"></i></span> `)
  } else {
    if (compareText.indexOf('.') > -1) {
      const moveNumber = compareText.substring(0, compareText.lastIndexOf('.') + 1)
      const moveWithoutNumber = text.substring(moveNumber.length).trim()
      return `${moveNumber} <span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-pawn ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${moveWithoutNumber}`
    } else {
      return `<span class="piece-glyph-wrapper ${color}-piece-glyph-wrapper"><i class="fas fa-chess-pawn ${color}-piece-glyph piece-glyph"></i></span>&nbsp;${text}`
    }
  }
}




let allPieces, cellIndex, pieceImages, pieceContainer, chessboardContainer, chessboardCells, chessboard, arrowContainer
let moveDescription, headerContainer
let cellSize, halfCellSize, quarterCellSize, eighthCellSize

const pieceNameIndex = {
  K: 'King',
  Q: 'Queen',
  B: 'Bishop',
  N: 'Knight',
  R: 'Rook',
  P: 'Pawn'
}

window.setupChessBoard = () => {
  allPieces = JSON.parse(window.defaultPieces)
  pieceContainer = document.createElement('div')
  pieceContainer.className = 'chessboard-pieces'
  chessboardContainer = document.querySelector('.chessboard-container')
  chessboardContainer.appendChild(pieceContainer)
  chessboard = document.querySelector('.chessboard')
  moveDescription = document.querySelector('.move-description')
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
    moveDescription.style.display = 'none'
    return
  }
  const columns = document.querySelector('.columns')
  columns.style.height = chessboard.parentNode.parentNode.offsetHeight + 'px'

  // play move sequence, this is at least the movement
  // arrow and piece sliding but may include more
  const move = window.turns[window.turn]
  const sequence = processSequence(move)
  headerContainer.style.display = 'none'
  moveDescription.style.display = ''
  moveDescription.innerHTML = describeMove()
  for (const step of sequence) {
    if (step.annotation && step.annotation.length) {
      moveDescription.innerHTML += '. <span class="annotation">' + step.annotation + '</span>'
    }
  }
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
      sequence.push({ type: 'annotation', annotation: nagIndex[segment.nag] })
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

// describe current move
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
      // for (const i in move.annotations) {
      //   move.annotations[i] = formatAnnotation(move.annotations[i])
      // }
      if (move.annotations.join('').trim()) {
        parts = move.annotations
      }
    }
    return parts.join(' ').replace(' .', '.')
  }
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
    properties.push('*')
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
      console.log('parsing pgn', pgnFileData)
      window.pgn = window.parser.parse(pgnFileData)
      console.log('parsed pgn', window.pgn)
    } catch (error) {
      console.log(error)
      return errorMessage(error.message)
    }
    // try {
    //   window.processPGNBoardStates(window.pgn, window.pieces)
    //   console.log('processed pgn', window.pgn)
    // } catch (error) {
    //   console.log(error)
    //   return errorMessage(error.message)
    // }
    window.turns = window.pgn.turns
    if (!window.components || !window.components.length) {
      const allComponents = [
        { name: 'chessboard', setup: window.setupChessBoard, refresh: window.renderChessBoard },
        { name: 'playback', setup: window.setupPlayback, refresh: window.refreshPlayback },
        { name: 'header', setup: window.setupHeader, refresh: window.refreshHeader },
        { name: 'tabs', setup: window.setupTabs },
        { name: 'annotations', setup: window.setupAnnotations, refresh: window.window.refreshAnnotations },
        { name: 'pgn', setup: window.setupPGN, refresh: window.refreshPGN },
        { name: 'tags', setup: window.setupTags }
      ]
      window.components = []
      for (const component of allComponents) {
        const element = document.getElementsByClassName(component.name)
        if (!element || !component.setup) {
          console.log('not using component ' + component.name)
          continue
        }
        try {
          component.setup()
        } catch (error) {
          console.log('error setting up component', error)
        }
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
        try {
          component.refresh(event)
        } catch (error) {
          console.log(error)
        }
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
      pgnContainer.style.display = 'block'
    }
  }
  const menuContainer = document.querySelector('.view-pgn-controls')
  const pasteContainer = document.querySelector('.paste-pgn-container')
  const pgnContainer = document.querySelector('.view-pgn')
  const cancelPastebutton = document.querySelector('.file-cancel-paste')
  if (cancelPastebutton) {
    cancelPastebutton.onclick = () => {
      pasteContainer.style.display = 'none'
      pgnContainer.style.display = 'block'
      menuContainer.style.display = 'block'
    }
  }
  const pasteTextButton = document.querySelector('.file-paste')
  if (pasteTextButton) {
    pasteTextButton.onclick = () => {
      pasteContainer.style.display = 'block'
      pgnContainer.style.display = 'none'
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
    return {
      FEN: startingFEN,
      tags,
      turns,
      toString: () => {
        const tagText = []
        const tagKeys = Object.keys(tags)
        for (const tag of tagKeys) {
          tagText.push(`[${tag} "${tags[tag]}"]`)
        }
        const moveText = []
        for (const turn of turns) {
          const prepend = turn.pgn.substring(0, turn.pgn.indexOf(turn.sequence[0]))
          moveText.push(prepend + turn.sequence.join(' '))
        }
        return `${tagText.join('\n')}\n\n${moveText.join(' ')}`
      }
    }
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
        turn.siblings = turn.siblings || []
        turn.siblings.push(parseRecursively(itemLines))
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
          processTurn(turn, JSON.parse(JSON.stringify(turns)), piecesFork)
        }
      }
    }
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
                return [piece.coordinate, captureRight]
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
