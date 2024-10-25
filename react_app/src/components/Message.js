import React from 'react';
import { MdComputer, MdPerson } from 'react-icons/md';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import moment from 'moment';
import Image from './Image';
import { MdEdit } from 'react-icons/md';

/*
  Message Component
  
  - Displays a chat message with a timestamp and an icon.

  Props:
  - props (Object): Contains properties for the component, such as message details.
*/

const isBase64Image = (str) => {
  const regex = /^\s*data:([a-z]+\/([a-z]+));base64,([A-Za-z0-9+/]+={0,2})\s*$/;
  return regex.test(str);
};

const Message = (props) => {
  const { id, createdAt, content, ai = false, selected, isImage, onImageUpdate } = props.message;
  
  return (
    <div
      key={id}
      className={`${ai && 'flex-row-reverse bg-light-white'} message`}>
      {selected === 'VisualGPT' && ai ? (
        isImage ? (
          // <img className='message__img' src={content} alt="Annotated" />

                    <Image url={content} />
          
        ) : (
          <div className='message__wrapper'>
            <ReactMarkdown
              className={`message__markdown ${ai ? 'text-left' : 'text-right'}`}
              children={content}
              remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || 'language-js');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      children={String(children).replace(/\n$/, '')}
                      style={atomDark}
                      language={match[1]}
                      PreTag='div'
                      {...props}
                    />
                  ) : (
                    <code className={className} {...props}>
                      {children}{' '}
                    </code>
                  );
                },
              }}
            />

            <div
              className={`${ai ? 'text-left' : 'text-right'} message__createdAt`}>
              {moment(createdAt).calendar()}
            </div>
          </div>
        )
      ) : (
        <div className='message__wrapper'>
          <ReactMarkdown
            className={`message__markdown ${ai ? 'text-left' : 'text-right'}`}
            children={content}
            remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || 'language-js');
                return !inline && match ? (
                  <SyntaxHighlighter
                    children={String(children).replace(/\n$/, '')}
                    style={atomDark}
                    language={match[1]}
                    PreTag='div'
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}{' '}
                  </code>
                );
              },
            }}
          />
          <div
            className={`${ai ? 'text-left' : 'text-right'} message__createdAt`}>
            {moment(createdAt).calendar()}
          </div>
        </div>
      )}
<div className='message__pic' style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
  {ai && !isImage ? (
    <div>
      <MdComputer />
    </div>
  ) : null}

  {ai && isImage ? (
    <div>
      <MdComputer style={{ marginBottom: '5px' , marginTop: '15px'}} />
    </div>
  ) : null}

  {ai && isImage ? (
    <div>
      <MdEdit onClick={() => props.onEditClick(content)} style={{boxShadow:'2px 2px 4px rgba(0, 0, 0, 0.2)', cursor: 'pointer', fontSize: '24px' , color: 'green'}} />
    </div>
  ) : null}

  {!ai ? (
    <div>
      <MdPerson />
    </div>
  ) : null}
</div>


    </div>
  );
};

export default Message;
