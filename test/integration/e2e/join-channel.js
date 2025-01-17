/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const {Utils:utils} = require('fabric-common');
const logger = utils.getLogger('E2E join-channel');

const tape = require('tape');
const _test = require('tape-promise').default;
const test = _test(tape);

const util = require('util');
const path = require('path');
const fs = require('fs');

const Client = require('fabric-client');

const testUtil = require('../util.js');
const e2eUtils = require('./e2eUtils.js');

let tx_id = null;

let ORGS;
const channelName = process.env.channel ? process.env.channel : testUtil.END2END.channel;

//
// Attempt to send a request to the orderer with the createChannel method
//
test('\n\n***** End-to-end flow: join channel *****\n\n', (t) => {
	Client.addConfigFile(path.join(__dirname, './config.json'));
	ORGS = Client.getConfigSetting('test-network');

	joinChannel('org1', channelName, t)
		.then(() => {
			t.pass(util.format('Successfully joined peers in organization "%s" to the channel', ORGS.org1.name));
			return joinChannel('org2', channelName, t);
		}, (err) => {
			t.fail(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS.org1.name, err.stack ? err.stack : err));
			t.end();
		})
		.then(() => {
			t.pass(util.format('Successfully joined peers in organization "%s" to the channel', ORGS.org2.name));
			t.end();
		}, (err) => {
			t.fail(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS.org2.name), err.stack ? err.stack : err);
			t.end();
		})
		.catch((err) => {
			t.fail('Failed request. ' + err);
			t.end();
		});
});

function joinChannel(org, defaultChannelName, t) {
	const channel_name = Client.getConfigSetting('E2E_CONFIGTX_CHANNEL_NAME', defaultChannelName);
	//
	// Create and configure the test channel
	//
	const client = new Client();
	const channel = client.newChannel(channel_name);
	logger.info('joining channel %s', channel_name);

	const orgName = ORGS[org].name;

	const targets = [];

	const caRootsPath = ORGS.orderer.tls_cacerts;
	let data = fs.readFileSync(path.join(__dirname, caRootsPath));
	const caroots = Buffer.from(data).toString();
	let genesis_block = null;
	let tlsInfo = null;

	return e2eUtils.tlsEnroll(org)
		.then((enrollment) => {
			t.pass('Successfully retrieved TLS certificate');
			tlsInfo = enrollment;
			client.setTlsClientCertAndKey(tlsInfo.certificate, tlsInfo.key);

			return Client.newDefaultKeyValueStore({path: testUtil.storePathForOrg(orgName)});
		}).then((store) => {
			client.setStateStore(store);

			return testUtil.getOrderAdminSubmitter(client, t);
		}).then(() => {
			t.pass('Successfully enrolled orderer \'admin\' (joined_channel 1)');
			channel.addOrderer(
				client.newOrderer(
					ORGS.orderer.url,
					{
						'pem': caroots,
						'ssl-target-name-override': ORGS.orderer['server-hostname']
					}
				)
			);
			tx_id = client.newTransactionID();
			const request = {
				txId : 	tx_id
			};

			return channel.getGenesisBlock(request);
		}).then((block) => {
			t.pass('Successfully got the genesis block');
			genesis_block = block;

			// get the peer org's admin required to send join channel requests
			client._userContext = null;

			return testUtil.getSubmitter(client, t, true /* get peer org admin */, org);
		}).then(() => {
			t.pass('Successfully enrolled org (join_channel):' + org + ' \'admin\'');

			for (const key in ORGS[org]) {
				if (ORGS[org].hasOwnProperty(key)) {
					if (key.indexOf('peer') === 0) {
						data = fs.readFileSync(path.join(__dirname, ORGS[org][key].tls_cacerts));
						targets.push(
							client.newPeer(
								ORGS[org][key].requests,
								{
									pem: Buffer.from(data).toString(),
									'ssl-target-name-override': ORGS[org][key]['server-hostname']
								}
							)
						);
					}
				}
			}

			tx_id = client.newTransactionID();
			const request = {
				targets : targets,
				block : genesis_block,
				txId : 	tx_id
			};

			return channel.joinChannel(request, 30000);
		}, (err) => {
			t.fail('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
			throw new Error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
		})
		.then((results) => {
			logger.debug(util.format('Join Channel R E S P O N S E : %j', results));

			if (results && results[0] && results[0].response && results[0].response.status === 200) {
				t.pass(util.format('Successfully joined peers in organization %s to join the channel', orgName));
			} else {
				t.fail(' Failed to join channel');
				throw new Error('Failed to join channel');
			}
		}, (err) => {
			t.fail('Failed to join channel due to error: ' + err.stack ? err.stack : err);
		});
}
