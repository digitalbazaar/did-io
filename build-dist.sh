mkdir ./dist/esm
cat >dist/esm/index.js <<!EOF
import cjsModule from '../index.js';
export const approvesMethodFor = cjsModule.approvesMethodFor;
export const findVerificationMethod = cjsModule.findVerificationMethod;
export const initKeys = cjsModule.initKeys;
export const parseDid = cjsModule.parseDid;
export const CachedResolver = cjsModule.CachedResolver;
export const VERIFICATION_RELATIONSHIPS = cjsModule.VERIFICATION_RELATIONSHIPS;
!EOF

cat >dist/esm/package.json <<!EOF
{
  "type": "module"
}
!EOF
