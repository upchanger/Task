/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const runSecurityTests = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

runSecurityTests('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'dbms-907bf',
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firebase/firestore.rules'), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'workspaces/ws1'), {
        id: 'ws1',
        name: 'Studio',
        slug: 'studio',
        ownerId: 'owner1',
        memberCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'workspaces/ws1/members/owner1'), {
        userId: 'owner1',
        workspaceId: 'ws1',
        workspaceName: 'Studio',
        role: 'owner',
        displayName: 'Owner',
        email: 'owner@test.com',
        joinedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'workspaces/ws1/members/member1'), {
        userId: 'member1',
        workspaceId: 'ws1',
        workspaceName: 'Studio',
        role: 'member',
        displayName: 'Member',
        email: 'member@test.com',
        joinedAt: new Date(),
      });
      await setDoc(doc(adminDb, 'workspaces/ws1/projects/proj1'), {
        id: 'proj1',
        workspaceId: 'ws1',
        name: 'Private Alpha',
        status: 'active',
        visibility: 'private',
        color: '#C85A32',
        createdBy: 'owner1',
        memberIds: ['owner1'],
        statuses: [],
        taskCount: 0,
        completedTaskCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('denies unauthenticated reads', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'workspaces/ws1')));
  });

  it('allows workspace members to read workspace but denies role escalation', async () => {
    const memberDb = testEnv.authenticatedContext('member1').firestore();
    await assertSucceeds(getDoc(doc(memberDb, 'workspaces/ws1')));
    await assertFails(updateDoc(doc(memberDb, 'workspaces/ws1/members/member1'), { role: 'owner' }));
  });

  it('denies private project reads to non-project members', async () => {
    const memberDb = testEnv.authenticatedContext('member1').firestore();
    await assertFails(getDoc(doc(memberDb, 'workspaces/ws1/projects/proj1')));
  });

  it('blocks client writes to immutable task activity logs', async () => {
    const ownerDb = testEnv.authenticatedContext('owner1').firestore();
    await assertFails(
      setDoc(doc(ownerDb, 'workspaces/ws1/projects/proj1/tasks/t1/activity/a1'), {
        type: 'task_created',
        actorId: 'owner1',
      }),
    );
  });
});
