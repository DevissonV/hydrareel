import { describe, expect, it } from 'vitest';
import { verifyMultipartParts } from './upload-session.use-case';
const MIB=1024*1024;
describe('multipart verification',()=>{
  it('accepts complete ordered parts and short last part',()=>{
    expect(verifyMultipartParts(19*MIB,8*MIB,[
      {partNumber:1,etag:'a',size:8*MIB},
      {partNumber:2,etag:'b',size:8*MIB},
      {partNumber:3,etag:'c',size:3*MIB},
    ])).toBe(true);
  });
  it('rejects missing, repeated, truncated and wrong sized parts',()=>{
    const parts=[
      {partNumber:1,etag:'a',size:8*MIB},
      {partNumber:3,etag:'c',size:3*MIB},
    ];
    expect(verifyMultipartParts(19*MIB,8*MIB,parts)).toBe(false);
    expect(verifyMultipartParts(19*MIB,8*MIB,[parts[0],parts[0],parts[1]])).toBe(false);
    expect(verifyMultipartParts(19*MIB,8*MIB,[{...parts[0],size:7*MIB},{partNumber:2,etag:'b',size:8*MIB},parts[1]])).toBe(false);
  });
});
