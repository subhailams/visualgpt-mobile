import React from 'react'
import { MdComputer } from 'react-icons/md'

/*
  Loading Component 

  Prints text while wait time
*/

const Loading = () => {
  return (
    <div className='message'>
      <div className='message__wrapper flex'>
        <div className="message__pic">
          <MdComputer />
        </div>
        <div className='text-left message__createdAt'>
          <div className="message__thinking">
            Generating..
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loading